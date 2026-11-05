import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchSales, fetchVisits } from "../api/endpoints";
import { requireLocation, type BusinessSnapshot, type ToolContext } from "../context";
import { groupLabel } from "../domain/labels";
import { compareGroups, comparePeriodFigures, type GroupValue } from "../domain/period-comparison";
import { resolvePeriod, type PeriodInput, type ResolvedPeriod } from "../domain/periods";
import { summarizeSales, summarizeVisits } from "../domain/summaries";
import { createSource } from "../source";
import { locationIdSchema, periodSchema, runTool } from "./tool-kit";

export const COMPARE_PERIODS = "compare_periods";

const DESCRIPTION = [
  "Compara dos periodos en ventas netas, tickets, ticket promedio, utilidad bruta, descuentos",
  "y visitas con tarjeta. Devuelve variación absoluta y porcentual, promedios por día (los",
  "periodos pueden durar distinto) y, opcionalmente, el desglose por sucursal o categoría con",
  "el grupo que más explica el cambio. Usar para '¿cómo me fue en X comparado con Y?'.",
].join(" ");

const INPUT = {
  current: periodSchema.describe("Periodo a evaluar, p. ej. last_full_month"),
  previous: periodSchema.describe("Periodo de comparación, p. ej. previous_full_month"),
  location_id: locationIdSchema.optional(),
  breakdown: z.enum(["location", "category", "none"]).default("location"),
};

type Args = {
  current: PeriodInput;
  previous: PeriodInput;
  location_id?: string;
  breakdown: "location" | "category" | "none";
};

async function loadFigures(ctx: ToolContext, period: ResolvedPeriod, locationId?: string) {
  const query = { from: period.from, to: period.to, location_id: locationId };
  const [sales, visits] = await Promise.all([
    fetchSales(ctx.api, "location", query),
    fetchVisits(ctx.api, "location", query),
  ]);
  return {
    figures: {
      period,
      sales: summarizeSales(sales.data.data),
      visits: summarizeVisits(visits.data.data),
    },
    salesRows: sales.data.data,
    endpoints: [sales.endpoint, visits.endpoint],
  };
}

async function loadCategoryValues(ctx: ToolContext, period: ResolvedPeriod, locationId?: string) {
  const query = { from: period.from, to: period.to, location_id: locationId };
  const response = await fetchSales(ctx.api, "category", query);
  const values: GroupValue[] = response.data.data.map((row) => ({
    key: String(row.key),
    label: groupLabel({ dimension: "category", key: row.key }),
    value: row.gross_sales ?? 0,
  }));
  return { values, endpoint: response.endpoint };
}

function toLocationValues(rows: Awaited<ReturnType<typeof loadFigures>>["salesRows"]) {
  return rows.map((row) => ({
    key: String(row.key),
    label: row.label ?? String(row.key),
    value: row.net_sales ?? 0,
  }));
}

async function buildComparison(ctx: ToolContext, snapshot: BusinessSnapshot, args: Args) {
  if (args.location_id) requireLocation(snapshot, args.location_id);
  const current = resolvePeriod(args.current, snapshot.window);
  const previous = resolvePeriod(args.previous, snapshot.window);
  const [now, before] = await Promise.all([
    loadFigures(ctx, current, args.location_id),
    loadFigures(ctx, previous, args.location_id),
  ]);
  const endpoints = [...now.endpoints, ...before.endpoints];
  const comparison = comparePeriodFigures(now.figures, before.figures);
  const breakdownKind = args.location_id && args.breakdown === "location" ? "none" : args.breakdown;

  if (breakdownKind === "location") {
    const groups = compareGroups(
      toLocationValues(now.salesRows),
      toLocationValues(before.salesRows),
    );
    return {
      comparison,
      endpoints,
      breakdown: { dimension: "location", metric: "net_sales", groups },
    };
  }
  if (breakdownKind === "category") {
    const [catNow, catBefore] = await Promise.all([
      loadCategoryValues(ctx, current, args.location_id),
      loadCategoryValues(ctx, previous, args.location_id),
    ]);
    const groups = compareGroups(catNow.values, catBefore.values);
    endpoints.push(catNow.endpoint, catBefore.endpoint);
    return {
      comparison,
      endpoints,
      breakdown: { dimension: "category", metric: "gross_sales", groups },
    };
  }
  return { comparison, endpoints, breakdown: undefined };
}

function buildWarnings(current: ResolvedPeriod, previous: ResolvedPeriod): string[] {
  if (current.days === previous.days) return [];
  return [
    `Los periodos tienen distinta duración (${current.days} vs ${previous.days} días); comparar también los promedios por día.`,
  ];
}

/**
 * ES: Registra compare_periods (escenario E-01).
 * EN: Registers compare_periods (scenario E-01).
 */
export function registerComparePeriods(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    COMPARE_PERIODS,
    { title: "Comparar periodos", description: DESCRIPTION, inputSchema: INPUT },
    (args) =>
      runTool(async () => {
        const snapshot = await ctx.getSnapshot();
        const result = await buildComparison(ctx, snapshot, args);
        const { current, previous } = result.comparison;
        const notes = [
          "Ventas netas sin tickets reembolsados (los analytics de la API ya los excluyen).",
          "Las visitas cuentan solo clientes que escanearon su tarjeta de lealtad.",
          ...(result.breakdown?.dimension === "category"
            ? ["El desglose por categoría usa ventas brutas antes de descuentos."]
            : []),
        ];
        return {
          data: {
            ...result.comparison,
            breakdown: result.breakdown,
            main_driver: result.breakdown?.groups[0],
          },
          notes,
          warnings: buildWarnings(current, previous),
          source: createSource({
            tool: COMPARE_PERIODS,
            params: args,
            endpoints: result.endpoints,
            dataAsOf: snapshot.window.dataAsOf,
            period: { from: previous.from, to: current.to },
            now: ctx.now,
          }),
        };
      }),
  );
}
