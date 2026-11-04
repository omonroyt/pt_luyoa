import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchSales } from "../api/endpoints";
import { requireLocation, type ToolContext } from "../context";
import { buildBreakdown, SALES_DIMENSIONS, salesMetricFor } from "../domain/breakdowns";
import { groupLabel } from "../domain/labels";
import { resolvePeriod } from "../domain/periods";
import { createSource } from "../source";
import { locationIdSchema, periodSchema, runTool } from "./tool-kit";

export const SALES_BREAKDOWN = "sales_breakdown";

const DESCRIPTION = [
  "Ventas de un periodo agrupadas por día de la semana, hora, sucursal, categoría, producto,",
  "mes, semana o día. Elige la métrica correcta: transacciones por día para día de la semana",
  "y hora; utilidad antes de descuentos para categoría y producto; ventas netas en el resto.",
  "Marca el grupo más alto y el más bajo. Usar para peor día, horas flojas, categorías más",
  "rentables o comparación de sucursales en un periodo.",
].join(" ");

const INPUT = {
  dimension: z.enum(SALES_DIMENSIONS),
  period: periodSchema,
  location_id: locationIdSchema.optional(),
  customer_type: z
    .enum(["member", "anonymous"])
    .optional()
    .describe("member: clientes con tarjeta; anonymous: ventas sin tarjeta"),
  top: z.number().int().min(1).max(50).optional().describe("Limitar a las N filas principales"),
};

const METRIC_NOTES: Record<ReturnType<typeof salesMetricFor>, string> = {
  transactions_per_day:
    "Se compara transactions_per_day porque cada día de la semana u hora aparece un número distinto de veces en el rango.",
  gross_profit_before_discounts:
    "La utilidad por categoría o producto es antes de descuentos, porque los descuentos se aplican al ticket completo.",
  net_sales: "Ventas netas sin tickets reembolsados.",
};

/**
 * ES: Registra sales_breakdown (escenarios E-02, E-03 y caso de ejemplo).
 * EN: Registers sales_breakdown (scenarios E-02, E-03 and the example case).
 */
export function registerSalesBreakdown(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    SALES_BREAKDOWN,
    { title: "Desglose de ventas", description: DESCRIPTION, inputSchema: INPUT },
    (args) =>
      runTool(async () => {
        const snapshot = await ctx.getSnapshot();
        if (args.location_id) requireLocation(snapshot, args.location_id);
        const period = resolvePeriod(args.period, snapshot.window);
        const response = await fetchSales(ctx.api, args.dimension, {
          from: period.from,
          to: period.to,
          location_id: args.location_id,
          customer_type: args.customer_type,
        });
        const metric = salesMetricFor(args.dimension);
        const breakdown = buildBreakdown({
          rows: response.data.data,
          dimension: args.dimension,
          value: (row) => row[metric] ?? 0,
          label: (row) =>
            groupLabel({ dimension: args.dimension, key: row.key, apiLabel: row.label }),
          isAdditive: metric !== "transactions_per_day",
          top: args.top,
        });
        const isTrimmed = breakdown.rows.length < breakdown.total_rows;
        return {
          data: { dimension: args.dimension, metric, period, ...breakdown },
          notes: [METRIC_NOTES[metric]],
          warnings: isTrimmed
            ? [`Se muestran ${breakdown.rows.length} de ${breakdown.total_rows} filas.`]
            : [],
          source: createSource({
            tool: SALES_BREAKDOWN,
            endpoints: [response.endpoint],
            dataAsOf: snapshot.window.dataAsOf,
            period,
            now: ctx.now,
          }),
        };
      }),
  );
}
