import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { countCustomers, fetchSales, fetchVisits } from "../api/endpoints";
import type { BusinessSnapshot, ToolContext } from "../context";
import { assessLocation, rankByConcern } from "../domain/location-health";
import { resolvePeriod, type PeriodInput, type ResolvedPeriod } from "../domain/periods";
import { createSource } from "../source";
import { periodSchema, runTool } from "./tool-kit";

export const LOCATION_HEALTH = "location_health";

const DESCRIPTION = [
  "Salud de cada sucursal contra su propio historial: ventas netas, tickets, ticket promedio",
  "y visitas por día del periodo reciente contra el base, tendencia del último trimestre,",
  "serie mensual y clientes en riesgo o dormidos de esa sucursal. Asigna un nivel de",
  "preocupación (alta, media, baja) con reglas explícitas y sus razones. Usar para '¿qué",
  "sucursal me debería preocupar?'. Por defecto compara las últimas 12 semanas con las 12 previas.",
].join(" ");

const INPUT = {
  recent: periodSchema.optional().describe("Periodo reciente (por defecto last_12_weeks)"),
  baseline: periodSchema.optional().describe("Periodo base (por defecto previous_12_weeks)"),
};

async function loadGrouped(ctx: ToolContext, period: ResolvedPeriod) {
  const query = { from: period.from, to: period.to };
  const [sales, visits] = await Promise.all([
    fetchSales(ctx.api, "location", query),
    fetchVisits(ctx.api, "location", query),
  ]);
  return {
    sales: sales.data.data,
    visits: visits.data.data,
    endpoints: [sales.endpoint, visits.endpoint],
  };
}

async function loadLocationExtras(
  ctx: ToolContext,
  snapshot: BusinessSnapshot,
  locationId: string,
) {
  const window = { from: snapshot.window.dataFrom, to: snapshot.window.dataAsOf };
  const [monthly, atRisk, dormant] = await Promise.all([
    fetchSales(ctx.api, "month", { ...window, location_id: locationId }),
    countCustomers(ctx.api, { segment: "at_risk", home_location_id: locationId }),
    countCustomers(ctx.api, { segment: "dormant", home_location_id: locationId }),
  ]);
  return {
    monthly: monthly.data.data,
    risk: { at_risk: atRisk.data, dormant: dormant.data },
    endpoints: [monthly.endpoint, atRisk.endpoint, dormant.endpoint],
  };
}

async function assessAll(
  ctx: ToolContext,
  snapshot: BusinessSnapshot,
  args: { recent?: PeriodInput; baseline?: PeriodInput },
) {
  const recent = resolvePeriod(args.recent ?? "last_12_weeks", snapshot.window);
  const baseline = resolvePeriod(args.baseline ?? "previous_12_weeks", snapshot.window);
  const [recentData, baselineData, extras] = await Promise.all([
    loadGrouped(ctx, recent),
    loadGrouped(ctx, baseline),
    Promise.all(
      snapshot.locations.map((location) => loadLocationExtras(ctx, snapshot, location.id)),
    ),
  ]);
  const findRow = <T extends { key: string | number }>(rows: T[], id: string) =>
    rows.find((row) => String(row.key) === id);
  const assessments = snapshot.locations.map((location, index) =>
    assessLocation({
      id: location.id,
      name: location.name,
      recent: {
        sales: findRow(recentData.sales, location.id),
        visits: findRow(recentData.visits, location.id),
      },
      baseline: {
        sales: findRow(baselineData.sales, location.id),
        visits: findRow(baselineData.visits, location.id),
      },
      monthly: extras[index]?.monthly ?? [],
      risk: extras[index]?.risk ?? { at_risk: 0, dormant: 0 },
    }),
  );
  const endpoints = [
    ...recentData.endpoints,
    ...baselineData.endpoints,
    ...extras.flatMap((extra) => extra.endpoints),
  ];
  return { recent, baseline, ranking: rankByConcern(assessments), endpoints };
}

/**
 * ES: Registra location_health (escenario E-03).
 * EN: Registers location_health (scenario E-03).
 */
export function registerLocationHealth(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    LOCATION_HEALTH,
    { title: "Salud de sucursales", description: DESCRIPTION, inputSchema: INPUT },
    (args) =>
      runTool(async () => {
        const snapshot = await ctx.getSnapshot();
        const result = await assessAll(ctx, snapshot, args);
        const worst = result.ranking[0];
        return {
          data: {
            recent_period: result.recent,
            baseline_period: result.baseline,
            locations: result.ranking,
            most_concerning: worst && worst.concern.level !== "baja" ? worst.id : null,
          },
          notes: [
            "Cada sucursal se compara contra su propio historial; una sucursal más pequeña no es preocupante por sí misma.",
            "Nivel de preocupación: 1 punto por caída de 10% o más en tickets, visitas por día o tendencia trimestral; ventas netas suman 1 punto (≥10%) o 2 (≥20%). Alta ≥ 3, media 1-2, baja 0.",
          ],
          warnings: [],
          source: createSource({
            tool: LOCATION_HEALTH,
            params: args,
            endpoints: result.endpoints,
            dataAsOf: snapshot.window.dataAsOf,
            period: { from: result.baseline.from, to: result.recent.to },
            now: ctx.now,
          }),
        };
      }),
  );
}
