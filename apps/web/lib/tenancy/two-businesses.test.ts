/**
 * ES: CA-X05 con dos negocios configurados a la vez, sobre las fixtures y sin red: cada uno
 *     consulta la API con su llave y su caché, una llave cruzada no entrega datos y una
 *     aprobación de un negocio no sirve en el otro. El aislamiento de memoria, resúmenes y
 *     trazas en la base de datos se prueba en sus almacenes.
 * EN: CA-X05 with two businesses configured at once, over the fixtures and without network:
 *     each one queries the API with its key and cache, a crossed key returns no data, and an
 *     approval from one business does not work in the other. Memory, summary and trace
 *     isolation in the database is tested in their stores.
 */
import {
  createApprovalContent,
  createMemoryApprovalStore,
  createServerFactory,
  issueApprovalToken,
  type CampaignDraft,
} from "@alborada/mcp-server";
import { createFakeFetch, TEST_NOW } from "@alborada/mcp-server/testing";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it } from "vitest";

const SECRET = "secreto-de-prueba";
const KEYS = { biz_alborada: "llave-alborada", biz_norte: "llave-norte" } as const;

const NORTE_BUSINESS = {
  "GET /v1/business": {
    status: 200,
    body: {
      id: "biz_norte",
      name: "Café Norte",
      timezone: "America/Mexico_City",
      currency: "MXN",
      data_from: "2025-11-01",
      data_as_of: "2026-10-31",
      points_rule: "1 punto por cada $10 MXN pagados",
      reward_rule: "150 puntos = una bebida gratis (hasta $68 MXN)",
    },
  },
};

const DRAFT: CampaignDraft = {
  name: "Te extrañamos noviembre",
  objective: "Recuperar clientes en riesgo",
  channel: "whatsapp",
  audience: { segment_id: "at_risk" },
  offer: {
    type: "free_item",
    product_id: "prd_concha",
    valid_from: "2026-11-10",
    valid_to: "2026-11-24",
  },
  message: "Hace rato que no te vemos. Tu próxima concha va por nuestra cuenta.",
};

// ES: API falsa con un negocio por llave; registra qué llave usó cada solicitud.
// EN: Fake API with one business per key; records which key each request used.
function createTwoBusinessApi() {
  const byKey: Record<string, ReturnType<typeof createFakeFetch>> = {
    [KEYS.biz_alborada]: createFakeFetch(),
    [KEYS.biz_norte]: createFakeFetch(NORTE_BUSINESS),
  };
  const keysUsed: string[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const key = new Headers(init?.headers).get("x-api-key") ?? "";
    keysUsed.push(key);
    const target = byKey[key];
    if (!target) return new Response("{}", { status: 401 });
    return target(input, init);
  }) as typeof fetch;
  return { fetchImpl, keysUsed, byKey };
}

type Api = ReturnType<typeof createTwoBusinessApi>;
const store = createMemoryApprovalStore();

function factoryFor(api: Api, businessId: string, apiKey: string): () => McpServer {
  return createServerFactory(
    { apiKey, apiBaseUrl: "https://api.test", businessId },
    { fetchImpl: api.fetchImpl, now: () => TEST_NOW, approvals: { secret: SECRET, store } },
  );
}

async function callTool(factory: () => McpServer, name: string, args: object = {}) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await factory().connect(serverTransport);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);
  const result = await client.callTool({ name, arguments: { ...args } });
  await client.close();
  const [first] = result.content as Array<{ text: string }>;
  return { isError: Boolean(result.isError), text: first?.text ?? "" };
}

describe("dos negocios configurados a la vez (CA-X05)", () => {
  it("cada negocio consulta la API con su propia llave y su propia caché", async () => {
    const api = createTwoBusinessApi();
    const alborada = factoryFor(api, "biz_alborada", KEYS.biz_alborada);
    const norte = factoryFor(api, "biz_norte", KEYS.biz_norte);

    const first = await callTool(alborada, "get_business_context");
    const second = await callTool(norte, "get_business_context");

    expect(first.text).toContain("Café Alborada");
    expect(second.text).toContain("Café Norte");
    expect(second.text).not.toContain("Café Alborada");
    // ES: Norte hizo sus propias consultas: no recibió nada de la caché de Alborada.
    // EN: Norte made its own queries: it received nothing from Alborada's cache.
    expect(api.byKey[KEYS.biz_norte]?.calls).toContain("GET /v1/business");
    expect(new Set(api.keysUsed)).toEqual(new Set([KEYS.biz_alborada, KEYS.biz_norte]));
  });

  it("si se cruzan las llaves, el servidor no entrega datos del otro negocio", async () => {
    const api = createTwoBusinessApi();
    const crossed = factoryFor(api, "biz_norte", KEYS.biz_alborada);
    const result = await callTool(crossed, "get_business_context");
    expect(result.isError).toBe(true);
    expect(result.text).toMatch(/pertenece a otro negocio/);
    expect(result.text).not.toContain("Café Alborada");
  });

  it("una aprobación emitida para un negocio no crea campañas en el otro", async () => {
    const api = createTwoBusinessApi();
    const norte = factoryFor(api, "biz_norte", KEYS.biz_norte);
    const { token } = await issueApprovalToken(
      { action: "create", businessId: "biz_alborada", content: createApprovalContent(DRAFT) },
      { secret: SECRET, store, now: () => TEST_NOW },
    );

    const result = await callTool(norte, "create_campaign_draft", {
      campaign: DRAFT,
      approval_token: token,
    });

    expect(result.isError).toBe(true);
    expect(result.text).toMatch(/otro negocio/);
    const writes = api.byKey[KEYS.biz_norte]?.calls.filter((call) => call.startsWith("POST"));
    expect(writes).toEqual([]);
  });
});
