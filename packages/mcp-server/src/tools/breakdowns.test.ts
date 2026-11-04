import { afterEach, describe, expect, it } from "vitest";
import { connectTestClient } from "../testing/connect";

type Row = { key: string | number; label: string; value: number; share_percent?: number };
type Output = {
  data: { metric: string; rows: Row[]; highest: Row; lowest: Row; total_rows: number };
  notes: string[];
  warnings: string[];
  source: { endpoints: string[] };
};

let session: Awaited<ReturnType<typeof connectTestClient>>;

afterEach(async () => {
  await session.close();
});

describe("sales_breakdown", () => {
  it("encuentra el peor día con transacciones por día, no con totales", async () => {
    session = await connectTestClient();
    const { isError, payload } = await session.call<Output>("sales_breakdown", {
      dimension: "weekday",
      period: "last_12_weeks",
    });
    expect(isError).toBe(false);
    expect(payload.data.metric).toBe("transactions_per_day");
    expect(payload.data.rows).toHaveLength(7);
    expect(payload.data.lowest).toMatchObject({ label: "martes", value: 181.67 });
    expect(payload.data.highest).toMatchObject({ label: "sábado", value: 350.33 });
    expect(payload.data.rows[0]?.share_percent).toBeUndefined();
    expect(payload.notes[0]).toContain("transactions_per_day");
  });

  it("ordena categorías por utilidad antes de descuentos con su participación", async () => {
    session = await connectTestClient();
    const { payload } = await session.call<Output>("sales_breakdown", {
      dimension: "category",
      period: "last_3_months",
    });
    expect(payload.data.metric).toBe("gross_profit_before_discounts");
    expect(payload.data.highest).toMatchObject({ label: "Café caliente", value: 919_417 });
    const shares = payload.data.rows.reduce((total, row) => total + (row.share_percent ?? 0), 0);
    expect(shares).toBeCloseTo(100, 0);
    expect(payload.notes[0]).toContain("antes de descuentos");
  });

  it("recorta a las N filas principales y lo advierte", async () => {
    session = await connectTestClient();
    const { payload } = await session.call<Output>("sales_breakdown", {
      dimension: "product",
      period: "last_3_months",
      top: 5,
    });
    expect(payload.data.rows).toHaveLength(5);
    expect(payload.warnings[0]).toContain("5 de 19");
  });

  it("filtra por sucursal", async () => {
    session = await connectTestClient();
    const { isError, payload } = await session.call<Output>("sales_breakdown", {
      dimension: "weekday",
      period: "last_12_weeks",
      location_id: "loc_roma",
    });
    expect(isError).toBe(false);
    expect(payload.source.endpoints[0]).toContain("location_id=loc_roma");
  });
});

describe("visits_breakdown", () => {
  it("usa visitas por día por día de la semana y aclara que solo cuenta tarjeta", async () => {
    session = await connectTestClient();
    const { isError, payload } = await session.call<Output>("visits_breakdown", {
      dimension: "weekday",
      period: "last_12_weeks",
    });
    expect(isError).toBe(false);
    expect(payload.data.metric).toBe("visits_per_day");
    expect(payload.data.rows).toHaveLength(7);
    expect(payload.notes[0]).toContain("tarjeta");
  });
});
