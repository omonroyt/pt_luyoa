/**
 * ES: Doble de las escrituras de campañas (08 §3, escrituras simuladas). Responde
 *     POST /v1/campaigns, POST /v1/campaigns/{id}/send y GET /v1/campaigns/{id} de las
 *     campañas que creó, con la misma forma que la API: el MCP relee el borrador para
 *     verificar el token de envío y para confirmar el estado sent. Un segundo envío
 *     responde 409, como la API real.
 * EN: Double for campaign writes (08 §3, simulated writes). It answers POST /v1/campaigns,
 *     POST /v1/campaigns/{id}/send and GET /v1/campaigns/{id} for the campaigns it
 *     created, with the same shape as the API: the MCP re-reads the draft to verify the
 *     send token and to confirm the sent state. A second send answers 409, like the real API.
 */
export type WriteRecord = { kind: "create" | "send"; campaignId: string; at: number };

type CreateBody = {
  name: string;
  objective: string;
  channel: string;
  message: string;
  offer: {
    type: string;
    value?: number;
    product_id?: string;
    valid_from: string;
    valid_to: string;
  };
};

type StoredCampaign = ReturnType<typeof storedFrom>;

const SEND_PATH = /^\/v1\/campaigns\/([^/]+)\/send$/;
const CAMPAIGN_PATH = /^\/v1\/campaigns\/([^/]+)$/;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const apiError = (status: number, code: string, message: string) =>
  json(status, { error: { code, message } });

function storedFrom(id: string, body: CreateBody, createdAt: string) {
  return {
    id,
    name: body.name,
    objective: body.objective,
    status: "draft",
    channel: body.channel,
    audience_description: null,
    offer_type: body.offer.type,
    offer_value: body.offer.value ?? null,
    offer_product_id: body.offer.product_id ?? null,
    valid_from: body.offer.valid_from,
    valid_to: body.offer.valid_to,
    message: body.message,
    created_at: createdAt,
    sent_at: null as string | null,
    audience_size: null,
    simulated: true,
    results: null,
  };
}

export function createCampaignDouble(now: () => Date = () => new Date()) {
  const campaigns = new Map<string, StoredCampaign>();
  const writes: WriteRecord[] = [];

  const create = (body: CreateBody) => {
    const id = `cmp_eval_${String(campaigns.size + 1).padStart(3, "0")}`;
    campaigns.set(id, storedFrom(id, body, now().toISOString()));
    writes.push({ kind: "create", campaignId: id, at: Date.now() });
    return json(201, { id, status: "draft" });
  };

  const send = (id: string) => {
    const campaign = campaigns.get(id);
    if (!campaign) return apiError(404, "not_found", `No existe la campaña ${id}.`);
    if (campaign.status === "sent") {
      return apiError(409, "conflict", `La campaña ${id} ya fue enviada.`);
    }
    campaign.status = "sent";
    campaign.sent_at = now().toISOString();
    writes.push({ kind: "send", campaignId: id, at: Date.now() });
    return json(200, { campaign: { id }, message: "Campaña enviada" });
  };

  const read = (id: string) => {
    const stored = campaigns.get(id);
    return stored ? json(200, stored) : undefined;
  };

  const idIn = (pattern: RegExp, path: string) => {
    const match = pattern.exec(path)?.[1];
    return match ? decodeURIComponent(match) : undefined;
  };

  /**
   * ES: Devuelve la respuesta simulada o undefined si la solicitud no le toca al doble.
   * EN: Returns the simulated response or undefined if the request is not the double's.
   */
  const handle = (method: string, path: string, body: string | undefined) => {
    if (method === "POST" && path === "/v1/campaigns") {
      return create(JSON.parse(body ?? "{}") as CreateBody);
    }
    const sendId = method === "POST" ? idIn(SEND_PATH, path) : undefined;
    if (sendId) return send(sendId);
    const readId = method === "GET" ? idIn(CAMPAIGN_PATH, path) : undefined;
    return readId ? read(readId) : undefined;
  };

  return { handle, writes };
}
