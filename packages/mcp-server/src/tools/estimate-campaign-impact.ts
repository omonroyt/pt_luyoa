import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { previewAudience } from "../api/endpoints";
import { requireLocation, type BusinessSnapshot, type ToolContext } from "../context";
import { similarityScore, type CampaignSummary } from "../domain/campaigns";
import { estimateImpact } from "../domain/impact";
import { computeOfferEconomics, resolveOfferProduct } from "../domain/offers";
import { createSource } from "../source";
import { loadCampaigns, loadOfferBaseline } from "./campaign-data";
import {
  audienceSchema,
  channelSchema,
  offerSchema,
  type Audience,
  type Channel,
  type Offer,
} from "./campaign-schemas";
import { runTool } from "./tool-kit";

export const ESTIMATE_CAMPAIGN_IMPACT = "estimate_campaign_impact";

const DESCRIPTION = [
  "Impacto esperado de una campaña antes de enviarla, como rango (bajo, central, alto): alcance",
  "real del canal, visitas y ventas adicionales según el lift de la campaña pasada más parecida",
  "con grupo de control, canjes esperados, costo de la oferta y utilidad neta. Si no hay",
  "referencia con control, solo estima canjes y lo advierte. Usar al armar una propuesta.",
].join(" ");

const INPUT = { audience: audienceSchema, channel: channelSchema, offer: offerSchema };

const MIN_SIMILARITY = 2;

function pickReference(campaigns: readonly CampaignSummary[], channel: string, offerType: string) {
  const scored = campaigns
    .filter((campaign) => campaign.results)
    .map((campaign) => ({
      campaign,
      score: similarityScore(campaign, { channel, offer_type: offerType }),
    }))
    .filter((entry) => entry.score >= MIN_SIMILARITY)
    .sort((a, b) => b.score - a.score);
  const withLift = scored.find((entry) => entry.campaign.results?.lift_interval_points);
  return { similar: scored.map((entry) => entry.campaign), reference: withLift?.campaign };
}

type EstimateArgs = { audience: Audience; channel: Channel; offer: Offer };

function toLiftFraction(reference: CampaignSummary | undefined) {
  const interval = reference?.results?.lift_interval_points;
  if (!interval) return null;
  const mid = (reference?.results?.lift_points ?? 0) / 100;
  return { low: interval.low / 100, mid, high: interval.high / 100 };
}

/**
 * ES: Carga alcance, campañas y línea base, y calcula economía e impacto esperado.
 * EN: Loads reach, campaigns and baseline, and computes economics and expected impact.
 */
async function buildEstimate(ctx: ToolContext, snapshot: BusinessSnapshot, args: EstimateArgs) {
  if (args.audience.home_location_id) requireLocation(snapshot, args.audience.home_location_id);
  const [preview, campaignData, baseline] = await Promise.all([
    previewAudience(ctx.api, args.channel, args.audience),
    loadCampaigns(ctx),
    loadOfferBaseline(ctx, snapshot),
  ]);
  const product = resolveOfferProduct(args.offer, campaignData.products);
  const economics = computeOfferEconomics(args.offer, product, baseline.baseline);
  const { similar, reference } = pickReference(
    campaignData.campaigns,
    args.channel,
    args.offer.type,
  );
  const impact = estimateImpact({
    reachable: preview.data.reachable,
    liftInterval: toLiftFraction(reference),
    redemptionRates: similar.map(
      (campaign) => (campaign.results?.redemption_rate_percent ?? 0) / 100,
    ),
    avgTicket: baseline.baseline.avgTicket,
    visitGrossProfit: economics.visit_gross_profit,
    costPerRedemption: economics.cost_per_redemption,
  });
  return {
    data: {
      reach: preview.data,
      offer_economics: economics,
      reference_campaign: reference
        ? { id: reference.id, name: reference.name, ...reference.results }
        : null,
      similar_campaigns: similar.map((campaign) => campaign.id),
      impact,
    },
    assumptions: economics.assumptions,
    hasReference: Boolean(reference),
    similarCount: similar.length,
    endpoints: [preview.endpoint, ...campaignData.endpoints, baseline.endpoint],
  };
}

function buildWarnings(hasReference: boolean, similarCount: number): string[] {
  const warnings: string[] = [];
  if (!hasReference) {
    warnings.push(
      "No hay campaña parecida con grupo de control: solo se estiman canjes, no visitas incrementales.",
    );
  }
  if (similarCount === 0) {
    warnings.push("No hay campañas parecidas: los canjes esperados no tienen referencia.");
  }
  if (similarCount === 1) {
    warnings.push(
      "Una sola campaña de referencia: los canjes esperados no tienen rango de variación.",
    );
  }
  return warnings;
}

/**
 * ES: Registra estimate_campaign_impact (extra X-03).
 * EN: Registers estimate_campaign_impact (extra X-03).
 */
export function registerEstimateCampaignImpact(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    ESTIMATE_CAMPAIGN_IMPACT,
    { title: "Impacto esperado de una campaña", description: DESCRIPTION, inputSchema: INPUT },
    (args) =>
      runTool(async () => {
        const snapshot = await ctx.getSnapshot();
        const estimate = await buildEstimate(ctx, snapshot, args);
        return {
          data: estimate.data,
          notes: [
            "Rangos en orden [bajo, central, alto]; la utilidad neta es conservadora (bajo = menor utilidad con mayor costo).",
            ...estimate.assumptions,
            "Supuesto: las visitas adicionales tienen el ticket promedio del negocio.",
          ],
          warnings: buildWarnings(estimate.hasReference, estimate.similarCount),
          source: createSource({
            tool: ESTIMATE_CAMPAIGN_IMPACT,
            endpoints: estimate.endpoints,
            dataAsOf: snapshot.window.dataAsOf,
            now: ctx.now,
          }),
        };
      }),
  );
}
