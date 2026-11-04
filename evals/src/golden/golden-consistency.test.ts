import { readFileSync } from "node:fs";
import { connectTestClient } from "@alborada/mcp-server/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * ES: Compara las cifras clave de las herramientas del MCP con las respuestas de
 *     referencia, calculadas por otro camino. Si divergen, uno de los dos cálculos está mal.
 * EN: Compares the MCP tools' key figures with the reference answers, computed through
 *     a different path. If they diverge, one of the two calculations is wrong.
 */

// ES: Navega un JSON por una ruta de claves sin perder la verificación de tipos.
// EN: Walks a JSON value along a key path without giving up type checking.
const at = (value: unknown, ...path: Array<string | number>): unknown =>
  path.reduce<unknown>(
    (current, key) => (current as Record<string | number, unknown> | undefined)?.[key],
    value,
  );

const reachables = (rows: unknown) =>
  (rows as Array<{ reachable: number }>).map((row) => row.reachable);

const golden = (id: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../golden/${id}.json`, import.meta.url), "utf8"));

let session: Awaited<ReturnType<typeof connectTestClient>>;
const call = async (name: string, args: Record<string, unknown> = {}) =>
  at((await session.call(name, args)).payload, "data");

beforeAll(async () => {
  session = await connectTestClient();
});

afterAll(async () => {
  await session.close();
});

describe("herramientas del MCP vs respuestas de referencia", () => {
  it("E-01: ventas netas de octubre y septiembre y su variación", async () => {
    const figures = at(golden("E-01"), "figures");
    const data = await call("compare_periods", {
      current: "last_full_month",
      previous: "previous_full_month",
    });
    expect(at(data, "current", "net_sales")).toBe(at(figures, "current", "net_sales"));
    expect(at(data, "previous", "net_sales")).toBe(at(figures, "previous", "net_sales"));
    expect(at(data, "delta", "net_sales", "percent")).toBe(at(figures, "net_sales_change_percent"));
    expect(at(data, "delta", "transactions", "percent")).toBe(
      at(figures, "transactions_change_percent"),
    );
  });

  it("E-02: peor día de la semana por transacciones por día", async () => {
    const figures = at(golden("E-02"), "figures");
    const data = await call("sales_breakdown", { dimension: "weekday", period: "last_12_weeks" });
    expect(at(data, "lowest", "label")).toBe(at(figures, "worst", "weekday"));
    expect(at(data, "lowest", "value")).toBe(at(figures, "worst", "transactions_per_day"));
  });

  it("E-03: sucursal más preocupante", async () => {
    const data = await call("location_health");
    expect(at(data, "most_concerning")).toBe(at(golden("E-03"), "figures", "most_concerning"));
  });

  it("E-04: tamaño y alcance real de los clientes en riesgo", async () => {
    const atRisk = at(golden("E-04"), "figures", "at_risk");
    const data = await call("audience_reach", { audience: { segment_id: "at_risk" } });
    expect(at(data, "matched")).toBe(at(atRisk, "customers"));
    expect(reachables(at(data, "by_channel"))).toEqual(reachables(at(atRisk, "reach_by_channel")));
  });

  it("E-05: campaña con mayor efecto medido y su lift", async () => {
    const figures = at(golden("E-05"), "figures");
    const data = await call("campaign_performance");
    const best = at(figures, "best_measured");
    const reference = (at(figures, "campaigns") as Array<{ id: string; lift_points: number }>).find(
      (campaign) => campaign.id === best,
    );
    expect(at(data, "campaigns", 0, "id")).toBe(best);
    expect(at(data, "campaigns", 0, "results", "lift_points")).toBe(reference?.lift_points);
  });

  it("Caso de ejemplo: categoría con más utilidad antes de descuentos", async () => {
    const top = at(golden("EJEMPLO"), "figures", "top");
    const data = await call("sales_breakdown", { dimension: "category", period: "last_3_months" });
    expect(at(data, "highest", "value")).toBe(at(top, "gross_profit_before_discounts"));
    expect(at(data, "highest", "share_percent")).toBe(at(top, "share_percent"));
  });
});
