import { createServerFactory } from "@alborada/mcp-server";
import { describe, expect, it } from "vitest";
import { handleMcpRequest } from "./handle-mcp-request";

const SERVICE_TOKEN = "t".repeat(40);
const createServer = createServerFactory({ apiKey: "test", apiBaseUrl: "https://api.test" });

function rpc(method: string, params: object, token?: string) {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

const INITIALIZE = {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "test", version: "0" },
};

describe("handleMcpRequest", () => {
  it("rechaza solicitudes sin token de servicio o con uno incorrecto", async () => {
    const missing = await handleMcpRequest(rpc("initialize", INITIALIZE), {
      serviceToken: SERVICE_TOKEN,
      createServer,
    });
    const wrong = await handleMcpRequest(rpc("initialize", INITIALIZE, "x".repeat(40)), {
      serviceToken: SERVICE_TOKEN,
      createServer,
    });
    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
  });

  it("responde initialize con el nombre del servidor", async () => {
    const response = await handleMcpRequest(rpc("initialize", INITIALIZE, SERVICE_TOKEN), {
      serviceToken: SERVICE_TOKEN,
      createServer,
    });
    const body = (await response.json()) as { result: { serverInfo: { name: string } } };
    expect(response.status).toBe(200);
    expect(body.result.serverInfo.name).toBe("cafe-alborada");
  });

  it("lista las 13 herramientas por HTTP", async () => {
    const response = await handleMcpRequest(rpc("tools/list", {}, SERVICE_TOKEN), {
      serviceToken: SERVICE_TOKEN,
      createServer,
    });
    const body = (await response.json()) as { result: { tools: Array<{ name: string }> } };
    expect(body.result.tools).toHaveLength(13);
    expect(body.result.tools.map((tool) => tool.name)).toContain("send_campaign");
  });
});
