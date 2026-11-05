import { describe, expect, it, vi } from "vitest";
import type { BusinessConfig } from "./business-registry";
import { forEachBusiness } from "./for-each-business";

const business = (id: string): BusinessConfig => ({
  id,
  name: id,
  apiKey: `llave-${id}`,
  mcpServiceToken: `token-${id}`.padEnd(40, "x"),
});

describe("tarea por negocio (X-05)", () => {
  it("el fallo de un negocio no detiene a los demás ni registra sus datos", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const seen: string[] = [];
    const results = await forEachBusiness(
      [business("biz_a"), business("biz_b")],
      async (current) => {
        seen.push(current.id);
        if (current.id === "biz_a") throw new Error("la API no respondió");
        return `resumen de ${current.id}`;
      },
    );
    expect(seen).toEqual(["biz_a", "biz_b"]);
    expect(results).toEqual([
      { businessId: "biz_a", ok: false },
      { businessId: "biz_b", ok: true, value: "resumen de biz_b" },
    ]);
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/llave-|token-/);
    log.mockRestore();
  });
});
