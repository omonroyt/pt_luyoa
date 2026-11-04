/**
 * ES: Resultados de campañas pasadas: tasas, lift contra grupo de control y confiabilidad
 *     (bonus B-05, trampas T-08 y T-09). Sin grupo de control no se calcula lift.
 * EN: Past campaign results: rates, lift against the control group and reliability
 *     (bonus B-05, pitfalls T-08 and T-09). Without a control group no lift is computed.
 */
import type { Campaign, CampaignResults } from "../api/schemas";
import { ratio, roundTo, sharePercent } from "./metrics";

const RELIABLE_SAMPLE_SIZE = 100;
const Z_95 = 1.96;

type Reliability = "alta" | "media" | "baja";

function hasControl(results: CampaignResults): boolean {
  return (
    results.control_size > 0 &&
    results.control_visit_rate !== null &&
    results.treatment_visit_rate !== null
  );
}

function reliabilityOf(results: CampaignResults): { level: Reliability; reason: string } {
  if (!hasControl(results)) {
    return {
      level: "baja",
      reason: "Sin grupo de control: la visita no se puede atribuir a la campaña.",
    };
  }
  if (results.control_size < RELIABLE_SAMPLE_SIZE) {
    return {
      level: "media",
      reason: `Grupo de control pequeño (${results.control_size} clientes).`,
    };
  }
  return { level: "alta", reason: `Grupo de control de ${results.control_size} clientes.` };
}

/**
 * ES: Intervalo de confianza del 95% del lift (diferencia de proporciones), en fracción.
 * EN: 95% confidence interval of the lift (difference of proportions), as a fraction.
 */
export function liftInterval(results: CampaignResults) {
  if (!hasControl(results)) return null;
  const treated = results.treatment_visit_rate ?? 0;
  const control = results.control_visit_rate ?? 0;
  const treatedSize = Math.max(results.sent, 1);
  const standardError = Math.sqrt(
    (treated * (1 - treated)) / treatedSize + (control * (1 - control)) / results.control_size,
  );
  const lift = treated - control;
  return {
    low: roundTo(Math.max(lift - Z_95 * standardError, 0), 4),
    mid: roundTo(lift, 4),
    high: roundTo(lift + Z_95 * standardError, 4),
  };
}

export function campaignMetrics(campaign: Campaign, productName?: string) {
  const results = campaign.results;
  const base = {
    id: campaign.id,
    name: campaign.name,
    objective: campaign.objective,
    status: campaign.status,
    channel: campaign.channel,
    audience_description: campaign.audience_description,
    offer: {
      type: campaign.offer_type,
      value: campaign.offer_value,
      product_id: campaign.offer_product_id,
      product_name: productName ?? null,
    },
    valid_from: campaign.valid_from,
    valid_to: campaign.valid_to,
  };
  if (!results) return { ...base, results: null };
  const reliability = reliabilityOf(results);
  const interval = liftInterval(results);
  return {
    ...base,
    results: {
      sent: results.sent,
      delivered: results.delivered,
      redeemed: results.redeemed,
      control_size: results.control_size,
      open_rate_percent: sharePercent(results.opened, results.delivered),
      redemption_rate_percent: sharePercent(results.redeemed, results.sent),
      treatment_visit_rate_percent:
        results.treatment_visit_rate === null
          ? null
          : roundTo(results.treatment_visit_rate * 100, 1),
      control_visit_rate_percent:
        results.control_visit_rate === null ? null : roundTo(results.control_visit_rate * 100, 1),
      lift_points: interval ? roundTo(interval.mid * 100, 1) : null,
      lift_interval_points: interval
        ? { low: roundTo(interval.low * 100, 1), high: roundTo(interval.high * 100, 1) }
        : null,
      attributed_revenue: results.attributed_revenue,
      discount_cost: results.discount_cost,
      attributed_gross_profit: results.attributed_gross_profit,
      cost_per_redemption: ratio(results.discount_cost, results.redeemed),
      reliability: reliability.level,
      reliability_reason: reliability.reason,
    },
  };
}

export type CampaignSummary = ReturnType<typeof campaignMetrics>;

/**
 * ES: Ordena primero las campañas con lift medido (de mayor a menor) y después las
 *     demás por tasa de canje, que no es comparable con el lift.
 * EN: Sorts campaigns with measured lift first (highest to lowest), then the rest by
 *     redemption rate, which is not comparable with lift.
 */
export function rankCampaigns(campaigns: readonly CampaignSummary[]): CampaignSummary[] {
  const score = (campaign: CampaignSummary) => campaign.results?.lift_points ?? null;
  const redemption = (campaign: CampaignSummary) => campaign.results?.redemption_rate_percent ?? 0;
  const measured = campaigns.filter((campaign) => score(campaign) !== null);
  const unmeasured = campaigns.filter((campaign) => score(campaign) === null);
  return [
    ...measured.sort((a, b) => (score(b) ?? 0) - (score(a) ?? 0)),
    ...unmeasured.sort((a, b) => redemption(b) - redemption(a)),
  ];
}

export type SimilarityTarget = { channel?: string; offer_type?: string; keyword?: string };

export function similarityScore(campaign: CampaignSummary, target: SimilarityTarget): number {
  const text =
    `${campaign.name} ${campaign.objective ?? ""} ${campaign.audience_description ?? ""}`.toLowerCase();
  const channelPoints = target.channel === campaign.channel ? 2 : 0;
  const offerPoints = target.offer_type === campaign.offer.type ? 2 : 0;
  const keywordPoints = target.keyword && text.includes(target.keyword.toLowerCase()) ? 1 : 0;
  return channelPoints + offerPoints + keywordPoints;
}
