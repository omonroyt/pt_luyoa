/**
 * ES: Respuestas de referencia de los escenarios de ventas (E-01, E-02, E-03 y el caso
 *     de ejemplo), calculadas con cuentas simples sobre la API.
 * EN: Reference answers for the sales scenarios (E-01, E-02, E-03 and the example case),
 *     computed with simple arithmetic over the API.
 */
import type { GoldenApi } from "./api-client";
import { daysBetween, type scenarioRanges } from "./dates";

type Ranges = ReturnType<typeof scenarioRanges>;
type Range = { from: string; to: string };
type SalesRow = {
  key: string | number;
  label?: string;
  transactions: number;
  net_sales?: number;
  gross_profit?: number;
  discounts?: number;
  transactions_per_day?: number;
  gross_profit_before_discounts?: number;
};

const round = (value: number, decimals = 2) => Math.round(value * 10 ** decimals) / 10 ** decimals;
const percentChange = (current: number, previous: number) =>
  previous === 0 ? null : round(((current - previous) / previous) * 100, 1);
const sum = (rows: SalesRow[], pick: (row: SalesRow) => number | undefined) =>
  round(rows.reduce((total, row) => total + (pick(row) ?? 0), 0));

const sales = (api: GoldenApi, groupBy: string, range: Range) =>
  api.get<{ data: SalesRow[] }>("/v1/analytics/sales", { group_by: groupBy, ...range });

function totals(rows: SalesRow[], range: Range) {
  const netSales = sum(rows, (row) => row.net_sales);
  const transactions = sum(rows, (row) => row.transactions);
  return {
    ...range,
    days: daysBetween(range.from, range.to),
    net_sales: netSales,
    transactions,
    avg_ticket: round(netSales / transactions),
    gross_profit: sum(rows, (row) => row.gross_profit),
    discounts: sum(rows, (row) => row.discounts),
  };
}

export async function goldenMonthComparison(api: GoldenApi, ranges: Ranges) {
  const [currentRows, previousRows] = await Promise.all([
    sales(api, "month", ranges.lastFullMonth),
    sales(api, "month", ranges.previousFullMonth),
  ]);
  const current = totals(currentRows.data, ranges.lastFullMonth);
  const previous = totals(previousRows.data, ranges.previousFullMonth);
  return {
    question: "¿Cómo me fue en octubre comparado con septiembre?",
    figures: {
      current,
      previous,
      net_sales_change: round(current.net_sales - previous.net_sales),
      net_sales_change_percent: percentChange(current.net_sales, previous.net_sales),
      transactions_change_percent: percentChange(current.transactions, previous.transactions),
      avg_ticket_change_percent: percentChange(current.avg_ticket, previous.avg_ticket),
      net_sales_per_day: {
        current: round(current.net_sales / current.days),
        previous: round(previous.net_sales / previous.days),
      },
    },
  };
}

export async function goldenWorstWeekday(api: GoldenApi, ranges: Ranges) {
  const response = await sales(api, "weekday", ranges.last12Weeks);
  const rows = response.data.map((row) => ({
    weekday: row.label ?? String(row.key),
    transactions_per_day: row.transactions_per_day ?? 0,
  }));
  const sorted = [...rows].sort((a, b) => a.transactions_per_day - b.transactions_per_day);
  return {
    question: "¿Cuál es mi peor día de la semana y qué harías al respecto?",
    period: ranges.last12Weeks,
    figures: { by_weekday: rows, worst: sorted[0], best: sorted.at(-1) },
  };
}

export async function goldenLocationTrend(api: GoldenApi, ranges: Ranges) {
  const [recent, baseline] = await Promise.all([
    sales(api, "location", ranges.last12Weeks),
    sales(api, "location", ranges.previous12Weeks),
  ]);
  const byLocation = recent.data.map((row) => {
    const before = baseline.data.find((candidate) => candidate.key === row.key);
    return {
      location_id: String(row.key),
      name: row.label ?? String(row.key),
      recent_net_sales: row.net_sales ?? 0,
      baseline_net_sales: before?.net_sales ?? 0,
      net_sales_change_percent: percentChange(row.net_sales ?? 0, before?.net_sales ?? 0),
    };
  });
  const worst = [...byLocation].sort(
    (a, b) => (a.net_sales_change_percent ?? 0) - (b.net_sales_change_percent ?? 0),
  )[0];
  return {
    question: "¿Qué sucursal me debería preocupar?",
    period: { recent: ranges.last12Weeks, baseline: ranges.previous12Weeks },
    figures: { by_location: byLocation, most_concerning: worst?.location_id },
  };
}

export async function goldenCategoryProfit(api: GoldenApi, ranges: Ranges) {
  const response = await sales(api, "category", ranges.last3Months);
  const total = sum(response.data, (row) => row.gross_profit_before_discounts);
  const byCategory = response.data
    .map((row) => ({
      category: String(row.key),
      gross_profit_before_discounts: row.gross_profit_before_discounts ?? 0,
      share_percent: round(((row.gross_profit_before_discounts ?? 0) / total) * 100, 1),
    }))
    .sort((a, b) => b.gross_profit_before_discounts - a.gross_profit_before_discounts);
  return {
    question: "¿Qué categoría de productos me deja más utilidad y cómo la empujo?",
    period: ranges.last3Months,
    figures: { by_category: byCategory, top: byCategory[0], total_before_discounts: total },
  };
}
