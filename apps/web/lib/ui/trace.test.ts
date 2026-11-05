import { describe, expect, it, vi } from "vitest";
import {
  errorLabel,
  fetchStoredTrace,
  fetchTrace,
  formatMs,
  formatTokens,
  formatUsd,
  traceTotals,
  type TraceStep,
} from "./trace";

const step = (overrides: Partial<TraceStep>): TraceStep => ({
  kind: "tool",
  name: "compare_periods",
  reason: null,
  input: null,
  outputSummary: null,
  latencyMs: null,
  tokensIn: null,
  tokensOut: null,
  costUsd: null,
  errorCode: null,
  ...overrides,
});

describe("totales de la traza", () => {
  it("suma tokens y costo de las llamadas al modelo y el tiempo de todos los pasos", () => {
    const steps = [
      step({
        kind: "llm",
        name: "z-ai/glm-5.3-flash",
        tokensIn: 8000,
        tokensOut: 400,
        costUsd: 0.002,
        latencyMs: 5000,
      }),
      step({ latencyMs: 400 }),
      step({
        kind: "llm",
        name: "z-ai/glm-5.3-flash",
        tokensIn: 9000,
        tokensOut: 500,
        costUsd: 0.003,
        latencyMs: 4000,
      }),
    ];
    expect(traceTotals(steps)).toEqual({
      model: "z-ai/glm-5.3-flash",
      llmCalls: 2,
      toolCalls: 1,
      tokensIn: 17000,
      tokensOut: 900,
      costUsd: 0.005,
      latencyMs: 9400,
    });
  });

  it("da formato a tiempos, tokens, costo y errores", () => {
    expect(formatMs(412)).toBe("412 ms");
    expect(formatMs(6400)).toBe("6.4 s");
    expect(formatTokens(812)).toBe("812");
    expect(formatTokens(8100)).toBe("8.1k");
    expect(formatUsd(0.00612)).toBe("0.0061 USD");
    expect(errorLabel("figure_verification")).toContain("corrigió");
    expect(errorLabel("rate_limited")).toBe("Error del MCP: rate_limited");
  });
});

describe("lectura de la traza", () => {
  const jsonResponse = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  it("pide la traza del mensaje y valida la respuesta", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse(200, { steps: [step({})], conversationCostUsd: 0.01 }),
    );
    const trace = await fetchTrace("chat_1", "msg_1", fetcher);
    expect(trace.steps).toHaveLength(1);
    expect(fetcher.mock.calls[0]).toEqual(["/api/traces?conversation=chat_1&message=msg_1"]);
  });

  it("falla si el servidor responde con error", async () => {
    const fetcher = vi.fn(async () => jsonResponse(400, { error: { code: "validation_error" } }));
    await expect(fetchTrace("chat_1", "msg_1", fetcher)).rejects.toThrow("No se pudo leer");
  });

  it("vuelve a pedir una vez si la traza todavía no se guardó", async () => {
    const responses = [
      { steps: [], conversationCostUsd: null },
      { steps: [step({})], conversationCostUsd: 0.01 },
    ];
    const fetcher = vi.fn(async () => jsonResponse(200, responses.shift()));
    const wait = vi.fn(async () => undefined);
    const trace = await fetchStoredTrace("chat_1", "msg_1", { fetcher, wait });
    expect(trace.steps).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledOnce();
  });
});
