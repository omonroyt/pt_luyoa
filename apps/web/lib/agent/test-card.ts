/**
 * ES: Tarjeta de campaña válida para las pruebas, armada con las cifras reales de las
 *     fixtures: alcance de audience_reach y costo de offer_economics, con sus source.id.
 *     Como el control del orquestador solo ofrece la aprobación después de una tarjeta
 *     que pasa el verificador, los flujos de prueba deben mostrarla como el agente real.
 * EN: Valid campaign card for tests, built with the fixtures' real figures: reach from
 *     audience_reach and cost from offer_economics, with their source.id. Since the
 *     orchestrator control only offers approval after a card that passes the verifier,
 *     test flows must show it like the real agent.
 */
import { connectMcpClient } from "./mcp-tools";
import { payloadFromMcpResult } from "./source-registry";
import { fixtureMcpConnection, type ScriptedReply } from "./test-support";

export const REACH_QUERY = {
  toolName: "audience_reach",
  input: { audience: { segment_id: "at_risk" }, channels: ["whatsapp"] },
};
export const ECONOMICS_QUERY = {
  toolName: "offer_economics",
  input: { offer: { type: "free_item", product_id: "prd_concha" } },
};

type ReachRow = {
  channel: string;
  matched: number;
  reachable: number;
  excluded_no_consent: number;
  excluded_suspended: number;
  excluded_duplicates: number;
};

async function payloadOf(query: { toolName: string; input: object }) {
  const client = await connectMcpClient(fixtureMcpConnection());
  try {
    const execute = (await client.tools())[query.toolName]?.execute;
    const result: unknown = await execute?.(query.input, {
      toolCallId: "id",
      messages: [],
      context: {},
    });
    const payload = payloadFromMcpResult(result);
    if (!payload) throw new Error(`${query.toolName} no devolvió datos`);
    return payload;
  } finally {
    await client.close();
  }
}

export type TestCard = Awaited<ReturnType<typeof fixtureCampaignCard>>;

export async function fixtureCampaignCard() {
  const reach = await payloadOf(REACH_QUERY);
  const economics = await payloadOf(ECONOMICS_QUERY);
  const row = (reach.data as { by_channel: ReachRow[] }).by_channel[0] as ReachRow;
  const cost = (economics.data as { cost_per_redemption: number }).cost_per_redemption;
  return {
    title: "Te extrañamos",
    period: { from: "2026-11-10", to: "2026-11-24" },
    sources: [reach.source.id, economics.source.id],
    state: "proposal",
    name: "[eval] Te extrañamos",
    objective: "Recuperar clientes en riesgo",
    audience: { filters: { segment_id: "at_risk" }, description: "Clientes en riesgo" },
    channel: "whatsapp",
    reach: {
      matched: row.matched,
      reachable: row.reachable,
      excludedNoConsent: row.excluded_no_consent,
      excludedSuspended: row.excluded_suspended,
      excludedDuplicates: row.excluded_duplicates,
    },
    offer: {
      type: "free_item",
      productId: "prd_concha",
      validFrom: "2026-11-10",
      validTo: "2026-11-24",
    },
    economics: {
      costPerRedemption: cost,
      marginNote: "Costo por canje",
      totalCostRange: [cost, cost],
    },
    history: [],
    message: { text: "Hace rato que no te vemos. Tu próxima concha va por nuestra cuenta." },
    warnings: [],
  };
}

// ES: Pasos del guion que consultan las fuentes y muestran la tarjeta, como el agente real.
// EN: Script steps that query the sources and show the card, like the real agent.
export function cardSteps(card: object): ScriptedReply[] {
  return [REACH_QUERY, ECONOMICS_QUERY, { toolName: "show_campaign_card", input: card }];
}
