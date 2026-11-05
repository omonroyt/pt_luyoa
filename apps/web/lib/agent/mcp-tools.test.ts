import { createServerFactory } from "@alborada/mcp-server";
import { describe, expect, it } from "vitest";
import { connectMcpClient } from "./mcp-tools";

const SERVICE_TOKEN = "t".repeat(40);
const createServer = createServerFactory({ apiKey: "test", apiBaseUrl: "https://api.test" });

describe("connectMcpClient", () => {
  it("expone al AI SDK las 13 herramientas del MCP a través del manejador", async () => {
    const client = await connectMcpClient({ serviceToken: SERVICE_TOKEN, createServer });
    try {
      const tools = await client.tools();
      expect(Object.keys(tools)).toHaveLength(13);
      expect(Object.keys(tools)).toEqual(
        expect.arrayContaining(["compare_periods", "audience_reach", "send_campaign"]),
      );
    } finally {
      await client.close();
    }
  });
});
