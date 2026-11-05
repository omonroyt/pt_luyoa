import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { deltaTone, formatDelta, formatMxn, formatPeriod, formatValue } from "./format";
import { collectSources } from "./sources";

describe("formatos", () => {
  it("muestra pesos sin centavos salvo montos chicos como el ticket promedio", () => {
    expect(formatMxn(808254)).toBe("$808,254");
    expect(formatMxn(93.12)).toBe("$93.12");
  });

  it("da formato según la unidad del bloque", () => {
    expect(formatValue(4.2, "percent")).toBe("4.2%");
    expect(formatValue(8680, "count")).toBe("8,680");
    expect(formatValue(181.67, "per_day")).toBe("181.67");
    expect(formatValue(null, "count")).toBe("—");
  });

  it("escribe variaciones con signo y un decimal", () => {
    expect(formatDelta(4.2)).toBe("+4.2%");
    expect(formatDelta(-0.8)).toBe("−0.8%");
    expect(formatDelta(0)).toBe("0.0%");
  });

  it("describe el periodo con su etiqueta", () => {
    expect(formatPeriod({ from: "2026-10-01", to: "2026-10-31", label: "octubre 2026" })).toBe(
      "octubre 2026 · 2026-10-01 a 2026-10-31",
    );
    expect(
      formatPeriod({ from: "2026-08-09", to: "2026-10-31", label: "2026-08-09 a 2026-10-31" }),
    ).toBe("2026-08-09 a 2026-10-31");
  });

  it("decide si una variación es buena o mala según goodWhen", () => {
    expect(deltaTone(4.2, "up")).toBe("good");
    expect(deltaTone(-1.3, "up")).toBe("bad");
    expect(deltaTone(-2, "down")).toBe("good");
    expect(deltaTone(3)).toBe("neutral");
  });
});

describe("collectSources", () => {
  it("reúne las fuentes de los resultados del MCP en los mensajes", () => {
    const source = {
      id: "src_aaaaaaaaaa",
      tool: "compare_periods",
      endpoints: ["GET /v1/analytics/sales"],
      data_as_of: "2026-10-31",
      fetched_at: "2026-11-04T12:00:00.000Z",
    };
    const messages = [
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "compare_periods",
            toolCallId: "c1",
            state: "output-available",
            input: {},
            output: { content: [{ type: "text", text: JSON.stringify({ data: {}, source }) }] },
          },
        ],
      },
    ] as UIMessage[];
    expect(collectSources(messages).get("src_aaaaaaaaaa")?.tool).toBe("compare_periods");
  });
});
