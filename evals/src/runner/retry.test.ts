import { describe, expect, it, vi } from "vitest";
import { RATE_LIMIT_RETRIES, retryRateLimited } from "./retry";

const rateLimited = () =>
  new Error('get_business_context falló: {"error":{"code":"rate_limited"}}');

describe("reintento por límite de la API", () => {
  it("espera y reintenta cuando la API limita, hasta lograrlo", async () => {
    const run = vi.fn().mockRejectedValueOnce(rateLimited()).mockResolvedValueOnce("listo");
    const wait = vi.fn(async () => undefined);
    await expect(retryRateLimited(run, wait)).resolves.toBe("listo");
    expect(wait).toHaveBeenCalledOnce();
  });

  it("se rinde después de los reintentos permitidos", async () => {
    const run = vi.fn().mockRejectedValue(rateLimited());
    const wait = vi.fn(async () => undefined);
    await expect(retryRateLimited(run, wait)).rejects.toThrow("rate_limited");
    expect(run).toHaveBeenCalledTimes(RATE_LIMIT_RETRIES + 1);
  });

  it("no reintenta otros errores", async () => {
    const run = vi.fn().mockRejectedValue(new Error("otra cosa"));
    const wait = vi.fn(async () => undefined);
    await expect(retryRateLimited(run, wait)).rejects.toThrow("otra cosa");
    expect(wait).not.toHaveBeenCalled();
  });
});
