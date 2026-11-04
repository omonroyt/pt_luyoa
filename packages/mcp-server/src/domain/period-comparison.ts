/**
 * ES: Comparación de dos periodos: totales, variaciones, promedios por día y el grupo
 *     (sucursal o categoría) que más explica el cambio.
 * EN: Two-period comparison: totals, changes, per-day averages and the group
 *     (location or category) that explains the change the most.
 */
import { delta, perDay, sharePercent, type Delta } from "./metrics";
import type { ResolvedPeriod } from "./periods";
import type { SalesSummary, VisitsSummary } from "./summaries";

export type PeriodFigures = {
  period: ResolvedPeriod;
  sales: SalesSummary;
  visits: VisitsSummary;
};

export type GroupValue = { key: string; label: string; value: number };

export type GroupComparison = {
  key: string;
  label: string;
  current: number;
  previous: number;
  delta: Delta;
  share_of_change: number | null;
};

function describePeriod(figures: PeriodFigures) {
  const { period, sales, visits } = figures;
  return {
    ...period,
    ...sales,
    ...visits,
    per_day: {
      net_sales: perDay(sales.net_sales, period.days),
      transactions: perDay(sales.transactions, period.days),
      visits: perDay(visits.visits, period.days),
    },
  };
}

export function comparePeriodFigures(current: PeriodFigures, previous: PeriodFigures) {
  const now = describePeriod(current);
  const before = describePeriod(previous);
  return {
    current: now,
    previous: before,
    delta: {
      net_sales: delta(now.net_sales, before.net_sales),
      transactions: delta(now.transactions, before.transactions),
      avg_ticket: delta(now.avg_ticket, before.avg_ticket),
      gross_profit: delta(now.gross_profit, before.gross_profit),
      discounts: delta(now.discounts, before.discounts),
      visits: delta(now.visits, before.visits),
    },
    per_day_delta: {
      net_sales: delta(now.per_day.net_sales, before.per_day.net_sales),
      transactions: delta(now.per_day.transactions, before.per_day.transactions),
      visits: delta(now.per_day.visits, before.per_day.visits),
    },
  };
}

/**
 * ES: Compara grupos entre periodos y los ordena por el tamaño de su variación.
 *     share_of_change indica qué porcentaje del cambio total aporta cada grupo.
 * EN: Compares groups across periods and sorts them by the size of their change.
 *     share_of_change shows what percentage of the total change each group contributes.
 */
export function compareGroups(
  current: readonly GroupValue[],
  previous: readonly GroupValue[],
): GroupComparison[] {
  const now = new Map(current.map((group) => [group.key, group]));
  const before = new Map(previous.map((group) => [group.key, group]));
  const totalChange = sumValues(current) - sumValues(previous);
  return [...new Set([...now.keys(), ...before.keys()])]
    .map((key) => compareGroup(key, now.get(key), before.get(key), totalChange))
    .sort((a, b) => Math.abs(b.delta.absolute) - Math.abs(a.delta.absolute));
}

function sumValues(groups: readonly GroupValue[]): number {
  return groups.reduce((sum, group) => sum + group.value, 0);
}

function compareGroup(
  key: string,
  now: GroupValue | undefined,
  before: GroupValue | undefined,
  totalChange: number,
): GroupComparison {
  const currentValue = now?.value ?? 0;
  const previousValue = before?.value ?? 0;
  const change = delta(currentValue, previousValue);
  return {
    key,
    label: now?.label ?? before?.label ?? key,
    current: currentValue,
    previous: previousValue,
    delta: change,
    share_of_change: totalChange === 0 ? null : sharePercent(change.absolute, totalChange),
  };
}
