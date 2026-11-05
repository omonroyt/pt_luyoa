import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createServer } from "./server";
import { createFakeFetch, TEST_NOW } from "./testing/connect";

// ES: Las fixtures son de Café Alborada: la API responde con biz_alborada.
// EN: The fixtures belong to Café Alborada: the API answers with biz_alborada.
async function callContext(businessId: string | undefined) {
  const server = createServer(
    { apiKey: "test-key", apiBaseUrl: "https://api.test", businessId },
    { fetchImpl: createFakeFetch(), now: () => TEST_NOW },
  );
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);
  const result = await client.callTool({ name: "get_business_context", arguments: {} });
  await client.close();
  const [first] = result.content as Array<{ text: string }>;
  return { isError: Boolean(result.isError), payload: JSON.parse(first?.text ?? "{}") };
}

describe("candado de identidad del negocio (X-05)", () => {
  it("atiende cuando la llave responde con el negocio esperado", async () => {
    const result = await callContext("biz_alborada");
    expect(result.isError).toBe(false);
  });

  it("no entrega datos si la llave pertenece a otro negocio", async () => {
    const result = await callContext("biz_otro");
    expect(result.isError).toBe(true);
    expect(result.payload.error.code).toBe("unauthorized");
    expect(result.payload.error.message).toMatch(/otro negocio/);
    expect(JSON.stringify(result.payload)).not.toMatch(/Alborada|loc_roma/);
  });

  it("sin negocio esperado atiende al de la llave, como en el CLI", async () => {
    const result = await callContext(undefined);
    expect(result.isError).toBe(false);
  });
});
