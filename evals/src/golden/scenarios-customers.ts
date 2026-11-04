/**
 * ES: Respuestas de referencia de los escenarios de clientes y campañas (E-04, E-05, E-06).
 * EN: Reference answers for the customer and campaign scenarios (E-04, E-05, E-06).
 */
import type { GoldenApi } from "./api-client";
import type { scenarioRanges } from "./dates";

type Ranges = ReturnType<typeof scenarioRanges>;
type Preview = {
  channel: string;
  matched: number;
  reachable: number;
  excluded_no_consent: number;
  excluded_suspended: number;
  excluded_duplicates: number;
};
type Campaign = {
  id: string;
  name: string;
  channel: string;
  offer_type: string;
  results: {
    sent: number;
    redeemed: number;
    control_size: number;
    treatment_visit_rate: number | null;
    control_visit_rate: number | null;
  } | null;
};

const CHANNELS = ["push", "whatsapp", "email"];
const WHATSAPP_MESSAGE_LIMIT = 1024;
const round1 = (value: number) => Math.round(value * 10) / 10;

const preview = (api: GoldenApi, channel: string, segmentId: string) =>
  api.post<Preview>("/v1/campaigns/preview", { channel, audience: { segment_id: segmentId } });

async function reachOf(api: GoldenApi, segmentId: string) {
  const previews = await Promise.all(CHANNELS.map((channel) => preview(api, channel, segmentId)));
  return previews.sort((a, b) => b.reachable - a.reachable);
}

export async function goldenLostCustomers(api: GoldenApi) {
  const [segments, atRisk, dormant] = await Promise.all([
    api.get<{ data: Array<{ id: string; customers: number }> }>("/v1/segments"),
    reachOf(api, "at_risk"),
    reachOf(api, "dormant"),
  ]);
  const size = (id: string) => segments.data.find((segment) => segment.id === id)?.customers ?? 0;
  return {
    question: "¿Qué clientes estoy perdiendo y a cuántos puedo contactar?",
    figures: {
      at_risk: { customers: size("at_risk"), reach_by_channel: atRisk },
      dormant: { customers: size("dormant"), reach_by_channel: dormant },
    },
  };
}

export async function goldenCampaignResults(api: GoldenApi) {
  const response = await api.get<{ data: Campaign[] }>("/v1/campaigns", { limit: 100 });
  const campaigns = response.data.map((campaign) => {
    const results = campaign.results;
    const hasControl = Boolean(
      results && results.control_size > 0 && results.control_visit_rate !== null,
    );
    return {
      id: campaign.id,
      name: campaign.name,
      channel: campaign.channel,
      offer_type: campaign.offer_type,
      has_control: hasControl,
      lift_points:
        hasControl && results
          ? round1(((results.treatment_visit_rate ?? 0) - (results.control_visit_rate ?? 0)) * 100)
          : null,
      redemption_rate_percent: results ? round1((results.redeemed / results.sent) * 100) : null,
      control_size: results?.control_size ?? 0,
    };
  });
  const measured = campaigns.filter((campaign) => campaign.lift_points !== null);
  const best = [...measured].sort((a, b) => (b.lift_points ?? 0) - (a.lift_points ?? 0))[0];
  return {
    question: "¿Qué campañas me han funcionado mejor? ¿Repetirías alguna?",
    figures: { campaigns, with_control: measured.length, best_measured: best?.id ?? null },
  };
}

export async function goldenRecoveryCampaign(api: GoldenApi, ranges: Ranges) {
  const reach = await reachOf(api, "at_risk");
  return {
    question: "Prepara una campaña para recuperar clientes y mándala.",
    figures: {
      audience: { segment_id: "at_risk" },
      reach_by_channel: reach,
      first_offer_date: ranges.firstOfferDate,
      whatsapp_message_limit: WHATSAPP_MESSAGE_LIMIT,
      requires_two_approvals: true,
    },
  };
}
