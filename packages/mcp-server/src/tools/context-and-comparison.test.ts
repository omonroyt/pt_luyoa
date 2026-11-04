import { afterEach, describe, expect, it } from "vitest";
import { connectTestClient } from "../testing/connect";

type Delta = { absolute: number; percent: number | null };
type PeriodTotals = {
  from: string;
  to: string;
  days: number;
  net_sales: number;
  transactions: number;
  avg_ticket: number;
};
type ComparisonData = {
  current: PeriodTotals;
  previous: PeriodTotals;
  delta: { net_sales: Delta };
  breakdown: { dimension: string; groups: Array<{ key: string }> };
  main_driver: { key: string };
};
type ContextData = {
  locations: unknown[];
  segments: Array<{ id: string }>;
  calendar: { presets: Record<string, { from: string; to: string }>; firstOfferDate: string };
};
type Output<TData = ComparisonData> = {
  data: TData;
  notes: string[];
  warnings: string[];
  source: { id: string; endpoints: string[]; data_as_of: string };
};
type ErrorOutput = { error: { code: string; message: string; suggestion?: string } };

let session: Awaited<ReturnType<typeof connectTestClient>>;

afterEach(async () => {
  await session.close();
});

describe("tools/list", () => {
  it("expone las herramientas con descripción para el agente", async () => {
    session = await connectTestClient();
    const { tools } = await session.client.listTools();
    const names = tools.map((tool) => tool.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "get_business_context",
        "compare_periods",
        "sales_breakdown",
        "visits_breakdown",
      ]),
    );
    expect(tools.every((tool) => (tool.description ?? "").length > 80)).toBe(true);
  });
});

describe("get_business_context", () => {
  it("entrega data_as_of, sucursales, segmentos y el calendario resuelto", async () => {
    session = await connectTestClient();
    const { isError, payload } = await session.call<Output<ContextData>>("get_business_context");
    expect(isError).toBe(false);
    expect(payload.source.data_as_of).toBe("2026-10-31");
    expect(payload.data.locations).toHaveLength(3);
    expect(payload.data.segments.map((segment: { id: string }) => segment.id)).toContain("at_risk");
    expect(payload.data.calendar.presets.last_12_weeks).toMatchObject({
      from: "2026-08-09",
      to: "2026-10-31",
    });
    expect(payload.data.calendar.firstOfferDate).toBe("2026-11-01");
    expect(payload.notes.join(" ")).toContain("data_as_of (2026-10-31)");
  });
});

describe("compare_periods", () => {
  it("compara octubre contra septiembre con variación, promedio por día y motor del cambio", async () => {
    session = await connectTestClient();
    const { isError, payload } = await session.call<Output>("compare_periods", {
      current: "last_full_month",
      previous: "previous_full_month",
    });
    expect(isError).toBe(false);
    expect(payload.data.current).toMatchObject({ from: "2026-10-01", to: "2026-10-31", days: 31 });
    expect(payload.data.current.net_sales).toBe(808_254);
    expect(payload.data.previous.net_sales).toBe(775_804);
    expect(payload.data.delta.net_sales).toEqual({ absolute: 32_450, percent: 4.2 });
    expect(payload.data.current.avg_ticket).toBe(
      Math.round((808_254 / payload.data.current.transactions) * 100) / 100,
    );
    expect(payload.data.breakdown.groups).toHaveLength(3);
    expect(payload.data.main_driver.key).toBe(payload.data.breakdown.groups[0]?.key);
    expect(payload.warnings[0]).toContain("31 vs 30 días");
    expect(payload.source.endpoints).toHaveLength(4);
  });

  it("aclara que el desglose por categoría es antes de descuentos", async () => {
    session = await connectTestClient();
    const { payload } = await session.call<Output>("compare_periods", {
      current: "last_full_month",
      previous: "previous_full_month",
      breakdown: "category",
    });
    expect(payload.data.breakdown.dimension).toBe("category");
    expect(payload.notes.join(" ")).toContain("antes de descuentos");
  });

  it("rechaza periodos fuera de los datos y sugiere el rango válido", async () => {
    session = await connectTestClient();
    const { isError, payload } = await session.call<ErrorOutput>("compare_periods", {
      current: { from: "2024-03-01", to: "2024-03-31" },
      previous: "previous_full_month",
    });
    expect(isError).toBe(true);
    expect(payload.error.code).toBe("validation_error");
    expect(payload.error.suggestion).toContain("2025-11-01");
  });

  it("rechaza una sucursal inexistente listando las válidas", async () => {
    session = await connectTestClient();
    const { isError, payload } = await session.call<ErrorOutput>("compare_periods", {
      current: "last_full_month",
      previous: "previous_full_month",
      location_id: "loc_narvarte",
    });
    expect(isError).toBe(true);
    expect(payload.error.code).toBe("not_found");
    expect(payload.error.suggestion).toContain("loc_roma");
  });
});
