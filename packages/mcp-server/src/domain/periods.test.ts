import { describe, expect, it } from "vitest";
import { ToolFailure } from "../errors";
import { buildCalendar, resolvePeriod, type DataWindow } from "./periods";

const WINDOW: DataWindow = { dataFrom: "2025-11-01", dataAsOf: "2026-10-31" };

describe("resolvePeriod", () => {
  it.each([
    ["last_full_month", "2026-10-01", "2026-10-31", 31],
    ["previous_full_month", "2026-09-01", "2026-09-30", 30],
    ["last_week", "2026-10-25", "2026-10-31", 7],
    ["previous_week", "2026-10-18", "2026-10-24", 7],
    ["last_12_weeks", "2026-08-09", "2026-10-31", 84],
    ["previous_12_weeks", "2026-05-17", "2026-08-08", 84],
    ["last_3_months", "2026-08-01", "2026-10-31", 92],
    ["previous_3_months", "2026-05-01", "2026-07-31", 92],
    ["all_data", "2025-11-01", "2026-10-31", 365],
  ] as const)("resuelve %s desde data_as_of", (preset, from, to, days) => {
    expect(resolvePeriod(preset, WINDOW)).toMatchObject({ from, to, days });
  });

  it("usa el mes anterior como último mes completo si data_as_of no es fin de mes", () => {
    const window = { dataFrom: "2025-11-01", dataAsOf: "2026-10-15" };
    expect(resolvePeriod("last_full_month", window)).toMatchObject({
      from: "2026-09-01",
      to: "2026-09-30",
      label: "septiembre 2026",
    });
  });

  it("etiqueta los meses completos con su nombre", () => {
    expect(resolvePeriod({ from: "2026-10-01", to: "2026-10-31" }, WINDOW).label).toBe(
      "octubre 2026",
    );
  });

  it("rechaza periodos fuera de los datos disponibles y sugiere el rango válido", () => {
    const attempt = () => resolvePeriod({ from: "2024-03-01", to: "2024-03-31" }, WINDOW);
    expect(attempt).toThrow(ToolFailure);
    expect(attempt).toThrow(/2025-11-01 a 2026-10-31/);
  });

  it("rechaza fechas inválidas", () => {
    expect(() => resolvePeriod({ from: "2026-02-30", to: "2026-03-01" }, WINDOW)).toThrow(
      /Fecha inválida/,
    );
  });

  it("rechaza rangos invertidos", () => {
    expect(() => resolvePeriod({ from: "2026-10-31", to: "2026-10-01" }, WINDOW)).toThrow(
      ToolFailure,
    );
  });
});

describe("buildCalendar", () => {
  it("incluye todos los presets y el primer día válido para ofertas", () => {
    const calendar = buildCalendar(WINDOW);
    expect(calendar.firstOfferDate).toBe("2026-11-01");
    expect(Object.keys(calendar.presets)).toHaveLength(9);
  });
});
