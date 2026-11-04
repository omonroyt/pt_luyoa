/**
 * ES: Desgloses por dimensión con la métrica correcta: por día de la semana u hora se
 *     usa el promedio por día (trampa T-02); por categoría o producto, la utilidad
 *     antes de descuentos (trampa T-03).
 * EN: Breakdowns by dimension with the right metric: by weekday or hour the per-day
 *     average is used (pitfall T-02); by category or product, profit before
 *     discounts (pitfall T-03).
 */
import { sharePercent, sumBy } from "./metrics";

export const SALES_DIMENSIONS = [
  "weekday",
  "hour",
  "location",
  "category",
  "product",
  "month",
  "week",
  "day",
] as const;
export type SalesDimension = (typeof SALES_DIMENSIONS)[number];
export const VISITS_DIMENSIONS = ["weekday", "hour", "location", "month", "week", "day"] as const;
export type VisitsDimension = (typeof VISITS_DIMENSIONS)[number];

const CHRONOLOGICAL = new Set(["month", "week", "day", "weekday", "hour"]);

export function salesMetricFor(dimension: SalesDimension) {
  if (dimension === "weekday" || dimension === "hour") return "transactions_per_day" as const;
  if (dimension === "category" || dimension === "product") {
    return "gross_profit_before_discounts" as const;
  }
  return "net_sales" as const;
}

export function visitsMetricFor(dimension: VisitsDimension) {
  return dimension === "weekday" || dimension === "hour"
    ? ("visits_per_day" as const)
    : ("visits" as const);
}

export type BreakdownInput<T> = {
  rows: readonly T[];
  dimension: string;
  value: (row: T) => number;
  label: (row: T) => string;
  isAdditive: boolean;
  top?: number;
};

export type BreakdownRow<T> = T & { label: string; value: number; share_percent?: number };

/**
 * ES: Etiqueta, ordena y recorta filas, marcando la de mayor y menor valor. La
 *     participación solo se calcula para métricas que se pueden sumar.
 * EN: Labels, sorts and trims rows, flagging the highest and lowest. The share is
 *     only computed for metrics that can be summed.
 */
export function buildBreakdown<T>(input: BreakdownInput<T>) {
  const total = sumBy(input.rows, input.value);
  const rows: BreakdownRow<T>[] = input.rows.map((row) => ({
    ...row,
    label: input.label(row),
    value: input.value(row),
    ...(input.isAdditive ? { share_percent: sharePercent(input.value(row), total) } : {}),
  }));
  const byValue = [...rows].sort((a, b) => b.value - a.value);
  const ordered = CHRONOLOGICAL.has(input.dimension) ? rows : byValue;
  const visible = input.top ? ordered.slice(0, input.top) : ordered;
  return {
    rows: visible,
    highest: byValue[0],
    lowest: byValue.at(-1),
    total_rows: rows.length,
    ...(input.isAdditive ? { total } : {}),
  };
}
