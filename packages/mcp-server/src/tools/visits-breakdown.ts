import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchVisits } from "../api/endpoints";
import { requireLocation, type ToolContext } from "../context";
import { buildBreakdown, VISITS_DIMENSIONS, visitsMetricFor } from "../domain/breakdowns";
import { groupLabel } from "../domain/labels";
import { resolvePeriod } from "../domain/periods";
import { createSource } from "../source";
import { locationIdSchema, periodSchema, runTool } from "./tool-kit";

export const VISITS_BREAKDOWN = "visits_breakdown";

const DESCRIPTION = [
  "Visitas con tarjeta de lealtad agrupadas por día de la semana, hora, sucursal, mes,",
  "semana o día, con tasa de compra. Usa visitas por día para día de la semana y hora.",
  "No incluye ventas sin tarjeta: para ventas totales usar sales_breakdown.",
].join(" ");

const INPUT = {
  dimension: z.enum(VISITS_DIMENSIONS),
  period: periodSchema,
  location_id: locationIdSchema.optional(),
};

/**
 * ES: Registra visits_breakdown (escenarios E-02 y E-03).
 * EN: Registers visits_breakdown (scenarios E-02 and E-03).
 */
export function registerVisitsBreakdown(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    VISITS_BREAKDOWN,
    { title: "Desglose de visitas", description: DESCRIPTION, inputSchema: INPUT },
    (args) =>
      runTool(async () => {
        const snapshot = await ctx.getSnapshot();
        if (args.location_id) requireLocation(snapshot, args.location_id);
        const period = resolvePeriod(args.period, snapshot.window);
        const response = await fetchVisits(ctx.api, args.dimension, {
          from: period.from,
          to: period.to,
          location_id: args.location_id,
        });
        const metric = visitsMetricFor(args.dimension);
        const locationNames = new Map(
          snapshot.locations.map((location) => [location.id, location.name]),
        );
        const breakdown = buildBreakdown({
          rows: response.data.data,
          dimension: args.dimension,
          value: (row) => row[metric],
          label: (row) =>
            locationNames.get(String(row.key)) ??
            groupLabel({ dimension: args.dimension, key: row.key, apiLabel: row.label }),
          isAdditive: metric === "visits",
        });
        return {
          data: { dimension: args.dimension, metric, period, ...breakdown },
          notes: [
            "Solo cuenta visitas con tarjeta de lealtad; las ventas sin tarjeta no aparecen aquí.",
            ...(metric === "visits_per_day"
              ? [
                  "Se compara visits_per_day porque cada día de la semana u hora aparece un número distinto de veces.",
                ]
              : []),
          ],
          warnings: [],
          source: createSource({
            tool: VISITS_BREAKDOWN,
            endpoints: [response.endpoint],
            dataAsOf: snapshot.window.dataAsOf,
            period,
            now: ctx.now,
          }),
        };
      }),
  );
}
