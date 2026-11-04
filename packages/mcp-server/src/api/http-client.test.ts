import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ToolFailure } from "../errors";
import { createApiClient } from "./http-client";
import { createRateLimiter } from "./rate-limiter";

const Item = z.object({ value: z.number() });

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

function buildClient(responses: Response[], retryBudgetMs = 10_000) {
  const fetchImpl = vi.fn(async () => responses.shift() ?? jsonResponse(500, {}));
  const sleep = vi.fn(async () => undefined);
  const limiter = createRateLimiter({ maxPerMinute: 120, maxConcurrent: 6, sleep });
  const client = createApiClient({
    baseUrl: "https://api.test",
    apiKey: "test-key",
    fetchImpl: fetchImpl as unknown as typeof fetch,
    limiter,
    sleep,
    retryBudgetMs,
  });
  return { client, fetchImpl, sleep };
}

async function captureFailure(promise: Promise<unknown>): Promise<ToolFailure> {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ToolFailure);
  return error as ToolFailure;
}

describe("createApiClient", () => {
  it("devuelve los datos validados y la descripción del endpoint, y usa la caché", async () => {
    const { client, fetchImpl } = buildClient([jsonResponse(200, { value: 7 })]);
    const first = await client.get("/v1/business", Item);
    const second = await client.get("/v1/business", Item);
    expect(first).toEqual({ data: { value: 7 }, endpoint: "GET /v1/business" });
    expect(second.data.value).toBe(7);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("ordena los parámetros para que la clave de caché sea estable", async () => {
    const { client } = buildClient([jsonResponse(200, { value: 1 })]);
    const response = await client.get("/v1/analytics/sales", Item, {
      to: "2026-10-31",
      group_by: "month",
      from: "2026-10-01",
    });
    expect(response.endpoint).toBe(
      "GET /v1/analytics/sales?from=2026-10-01&group_by=month&to=2026-10-31",
    );
  });

  it("rechaza filtros no verificados antes de llamar la API", async () => {
    const { client, fetchImpl } = buildClient([]);
    const failure = await captureFailure(
      client.get("/v1/customers", Item, { segment_id: "at_risk" }),
    );
    expect(failure.code).toBe("validation_error");
    expect(failure.suggestion).toContain("segment");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reintenta un 429 respetando Retry-After", async () => {
    const { client, sleep } = buildClient([
      jsonResponse(
        429,
        { error: { code: "rate_limited", message: "Límite" } },
        { "retry-after": "2" },
      ),
      jsonResponse(200, { value: 3 }),
    ]);
    const response = await client.get("/v1/business", Item);
    expect(response.data.value).toBe(3);
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it("devuelve busy reintentable cuando la espera excede el presupuesto", async () => {
    const { client } = buildClient(
      [jsonResponse(503, { error: { code: "busy", message: "Ocupado" } }, { "retry-after": "30" })],
      10_000,
    );
    const failure = await captureFailure(client.get("/v1/business", Item));
    expect(failure.code).toBe("busy");
    expect(failure.retryable).toBe(true);
  });

  it("no repite el mensaje de la API en un 401", async () => {
    const { client } = buildClient([
      jsonResponse(401, { error: { code: "unauthorized", message: "Llave abc123 inválida" } }),
    ]);
    const failure = await captureFailure(client.get("/v1/business", Item));
    expect(failure.code).toBe("unauthorized");
    expect(failure.message).not.toContain("abc123");
  });

  it("conserva el mensaje de un 422 con los valores válidos", async () => {
    const message = "query.tier: Input should be 'bronce', 'plata' or 'oro'";
    const { client } = buildClient([
      jsonResponse(422, { error: { code: "invalid_request", message } }),
    ]);
    const failure = await captureFailure(client.get("/v1/customers", Item, { tier: "gold" }));
    expect(failure.code).toBe("validation_error");
    expect(failure.message).toBe(message);
    expect(failure.retryable).toBe(false);
  });

  it("rechaza respuestas con un formato inesperado", async () => {
    const { client } = buildClient([jsonResponse(200, { value: "no es número" })]);
    const failure = await captureFailure(client.get("/v1/business", Item));
    expect(failure.code).toBe("upstream_error");
  });
});
