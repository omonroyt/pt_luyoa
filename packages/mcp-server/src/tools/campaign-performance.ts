import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ToolContext } from "../context";
import { rankCampaigns, similarityScore, type CampaignSummary } from "../domain/campaigns";
import { createSource } from "../source";
import { loadCampaigns } from "./campaign-data";
import { channelSchema, OFFER_TYPES } from "./campaign-schemas";
import { runTool } from "./tool-kit";

export const CAMPAIGN_PERFORMANCE = "campaign_performance";

const DESCRIPTION = [
  "Campañas pasadas con sus resultados: tasa de apertura y de canje, lift de visita contra",
  "grupo de control (solo cuando hubo control), intervalo de confianza, costo por canje y",
  "confiabilidad (alta, media, baja). Ordena primero las campañas con efecto medido. Con",
  "similar_to devuelve las más parecidas a una campaña propuesta. Usar para '¿qué campañas",
  "me han funcionado?' y antes de proponer una campaña, para aplicar lo aprendido.",
].join(" ");

const INPUT = {
  channel: channelSchema.optional(),
  offer_type: z.enum(OFFER_TYPES).optional(),
  similar_to: z
    .object({
      channel: channelSchema.optional(),
      offer_type: z.enum(OFFER_TYPES).optional(),
      keyword: z
        .string()
        .optional()
        .describe("Palabra clave del objetivo o audiencia, p. ej. 'recuperar'"),
    })
    .optional(),
};

function buildLearnings(ranked: readonly CampaignSummary[]): string[] {
  const withResults = ranked.filter((campaign) => campaign.results);
  const measured = withResults.filter((campaign) => campaign.results?.lift_points !== null);
  const learnings = [
    `${measured.length} de ${withResults.length} campañas tienen grupo de control; solo en esas el efecto en visitas es atribuible.`,
  ];
  const best = measured[0];
  if (best?.results) {
    learnings.push(
      `Mayor efecto medido: "${best.name}" (${best.channel}, ${best.offer.type}) con +${best.results.lift_points} pts de visita contra el control (confiabilidad ${best.results.reliability}).`,
    );
  }
  withResults
    .filter((campaign) => campaign.results?.lift_points === null)
    .forEach((campaign) =>
      learnings.push(
        `"${campaign.name}": ${campaign.results?.redemption_rate_percent}% de canje, sin grupo de control.`,
      ),
    );
  return learnings;
}

/**
 * ES: Registra campaign_performance (escenario E-05 y bonus B-05).
 * EN: Registers campaign_performance (scenario E-05 and bonus B-05).
 */
export function registerCampaignPerformance(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    CAMPAIGN_PERFORMANCE,
    { title: "Desempeño de campañas", description: DESCRIPTION, inputSchema: INPUT },
    (args) =>
      runTool(async () => {
        const snapshot = await ctx.getSnapshot();
        const { campaigns, endpoints } = await loadCampaigns(ctx);
        const filtered = campaigns.filter(
          (campaign) =>
            (!args.channel || campaign.channel === args.channel) &&
            (!args.offer_type || campaign.offer.type === args.offer_type),
        );
        const ranked = rankCampaigns(filtered);
        const similar = args.similar_to
          ? ranked
              .map((campaign) => ({
                id: campaign.id,
                score: similarityScore(campaign, args.similar_to ?? {}),
              }))
              .filter((entry) => entry.score > 0)
              .sort((a, b) => b.score - a.score)
          : undefined;
        const measuredCount = ranked.filter(
          (campaign) => (campaign.results?.lift_points ?? null) !== null,
        ).length;
        return {
          data: { campaigns: ranked, similar, learnings: buildLearnings(ranked) },
          notes: [
            "lift_points = tasa de visita del grupo tratado menos la del grupo de control, en puntos porcentuales.",
            "La tasa de canje sin grupo de control no mide efecto: también canjean clientes que habrían venido de todos modos.",
          ],
          warnings:
            measuredCount < 2
              ? [
                  `Solo ${measuredCount} campaña(s) con grupo de control: muestra pequeña para generalizar.`,
                ]
              : [],
          source: createSource({
            tool: CAMPAIGN_PERFORMANCE,
            endpoints,
            dataAsOf: snapshot.window.dataAsOf,
            now: ctx.now,
          }),
        };
      }),
  );
}
