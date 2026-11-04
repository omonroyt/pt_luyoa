import { describe, expect, it } from "vitest";
import { addMonths, isoWeekday } from "./dates";
import { groupLabel } from "./labels";
import { delta, perDay, ratio, sharePercent, sumBy } from "./metrics";

describe("metrics", () => {
  it("calcula variación absoluta y porcentual con un decimal", () => {
    expect(delta(808_254, 775_804)).toEqual({ absolute: 32_450, percent: 4.2 });
  });

  it("devuelve porcentaje null cuando el valor anterior es 0", () => {
    expect(delta(10, 0)).toEqual({ absolute: 10, percent: null });
  });

  it("normaliza por día y protege la división entre 0", () => {
    expect(perDay(8_680, 31)).toBe(280);
    expect(perDay(100, 0)).toBe(0);
  });

  it("calcula participación, sumas y razones", () => {
    expect(sharePercent(919_417, 1_786_735)).toBe(51.5);
    expect(sumBy([{ value: 1.005 }, { value: 2 }], (row) => row.value)).toBe(3.01);
    expect(ratio(808_254, 8_680)).toBe(93.12);
  });
});

describe("dates", () => {
  it("usa lunes = 1 y domingo = 7", () => {
    expect(isoWeekday("2026-10-26")).toBe(1);
    expect(isoWeekday("2026-10-31")).toBe(6);
    expect(isoWeekday("2026-11-01")).toBe(7);
  });

  it("suma meses cruzando el año", () => {
    expect(addMonths("2026-11-01", 2)).toBe("2027-01-01");
    expect(addMonths("2026-01-01", -2)).toBe("2025-11-01");
  });
});

describe("groupLabel", () => {
  it.each([
    [{ dimension: "month", key: "2026-10" }, "octubre 2026"],
    [{ dimension: "weekday", key: 2, apiLabel: "martes" }, "martes"],
    [{ dimension: "hour", key: 7 }, "07:00"],
    [{ dimension: "category", key: "cafe_caliente", apiLabel: "cafe_caliente" }, "Café caliente"],
    [{ dimension: "location", key: "loc_roma", apiLabel: "Roma Norte" }, "Roma Norte"],
    [{ dimension: "day", key: "2026-10-01" }, "1 de octubre 2026"],
  ])("etiqueta %o como %s", (input, expected) => {
    expect(groupLabel(input)).toBe(expected);
  });
});
