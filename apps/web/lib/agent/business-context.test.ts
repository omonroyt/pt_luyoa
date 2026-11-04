import { describe, expect, it } from "vitest";
import { loadBusinessContext, parseBusinessContext } from "./business-context";
import { connectMcpClient } from "./mcp-tools";
import { fixtureMcpConnection } from "./test-support";

describe("loadBusinessContext", () => {
  it("obtiene por el MCP la fecha de corte, las sucursales, el calendario y la fuente", async () => {
    const client = await connectMcpClient(fixtureMcpConnection());
    try {
      const context = await loadBusinessContext(await client.tools());
      expect(context.calendar.dataAsOf).toBe("2026-10-31");
      expect(context.calendar.firstOfferDate).toBe("2026-11-01");
      expect(context.locations.map((location) => location.name)).toEqual([
        "Coyoacán",
        "Polanco",
        "Roma Norte",
      ]);
      expect(context.calendar.presets.last_full_month?.label).toBe("octubre 2026");
      expect(context.sourceId).toMatch(/^src_/);
    } finally {
      await client.close();
    }
  });

  it("explica el fallo cuando la herramienta responde con error", () => {
    const failed = {
      content: [{ type: "text", text: '{"error":{"code":"unauthorized"}}' }],
      isError: true,
    };
    expect(() => parseBusinessContext(failed)).toThrow("get_business_context falló");
  });
});
