/**
 * ES: Agregación correcta de filas de analytics. Las métricas aditivas se suman; los
 *     promedios y tasas se recalculan a partir de los totales, nunca se suman.
 * EN: Correct aggregation of analytics rows. Additive metrics are summed; averages
 *     and rates are recomputed from the totals, never summed.
 */
import type { SalesRow, VisitsRow } from "../api/schemas";
import { ratio, roundTo, sumBy } from "./metrics";

export type SalesSummary = {
  net_sales: number;
  transactions: number;
  avg_ticket: number;
  gross_profit: number;
  discounts: number;
};

export type VisitsSummary = {
  visits: number;
  purchase_rate: number;
};

export function summarizeSales(rows: readonly SalesRow[]): SalesSummary {
  const netSales = sumBy(rows, (row) => row.net_sales);
  const transactions = sumBy(rows, (row) => row.transactions);
  return {
    net_sales: netSales,
    transactions,
    avg_ticket: ratio(netSales, transactions),
    gross_profit: sumBy(rows, (row) => row.gross_profit),
    discounts: sumBy(rows, (row) => row.discounts),
  };
}

/**
 * ES: unique_customers no se suma entre grupos (un cliente puede visitar varias
 *     sucursales); la tasa de compra se pondera por visitas.
 * EN: unique_customers is not summed across groups (a customer can visit several
 *     locations); the purchase rate is weighted by visits.
 */
export function summarizeVisits(rows: readonly VisitsRow[]): VisitsSummary {
  const visits = sumBy(rows, (row) => row.visits);
  const purchases = rows.reduce((total, row) => total + row.visits * row.purchase_rate, 0);
  return { visits, purchase_rate: visits === 0 ? 0 : roundTo(purchases / visits, 4) };
}
