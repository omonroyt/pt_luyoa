/**
 * ES: Conecta un cliente MCP real al servidor por un transporte en memoria, con la API
 *     falsa de fixtures. Las pruebas usan las herramientas igual que el agente.
 * EN: Connects a real MCP client to the server over an in-memory transport, backed by
 *     the fixture fake API. Tests use the tools the same way the agent does.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { ApprovalSettings } from "../context";
import { createServer } from "../server";
import { createFakeFetch } from "./fake-api";
import type { FixtureFile } from "./fixture-key";

export const TEST_NOW = new Date("2026-11-04T12:00:00Z");

export async function connectTestClient(overrides: FixtureFile = {}, approvals?: ApprovalSettings) {
  const fetchImpl = createFakeFetch(overrides);
  const server = createServer(
    { apiKey: "test-key", apiBaseUrl: "https://api.test" },
    { fetchImpl, now: () => TEST_NOW, approvals },
  );
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);

  // ES: Llama una herramienta y devuelve el JSON que recibiría el agente.
  // EN: Calls a tool and returns the JSON the agent would receive.
  const call = async <T = unknown>(name: string, args: Record<string, unknown> = {}) => {
    const result = await client.callTool({ name, arguments: args });
    const [first] = result.content as Array<{ type: string; text: string }>;
    return { isError: Boolean(result.isError), payload: JSON.parse(first?.text ?? "{}") as T };
  };

  return { client, call, fetchImpl, close: () => client.close() };
}
