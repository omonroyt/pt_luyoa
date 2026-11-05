import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../context";
import { buildCalendar } from "../domain/periods";
import { createSource } from "../source";
import { runTool } from "./tool-kit";

export const GET_BUSINESS_CONTEXT = "get_business_context";

const DESCRIPTION = [
  "Contexto fijo del negocio: nombre, fecha de corte (data_as_of), rango de datos,",
  "sucursales, segmentos con su definición y tamaño, reglas de puntos y el calendario",
  "de periodos ya resuelto. Usar al iniciar la conversación; todas las demás",
  "herramientas calculan sus periodos desde esta misma fecha de corte.",
].join(" ");

/**
 * ES: Registra get_business_context: la base temporal y de catálogo de toda la conversación.
 * EN: Registers get_business_context: the time and catalog baseline for the whole conversation.
 */
export function registerGetBusinessContext(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    GET_BUSINESS_CONTEXT,
    { title: "Contexto del negocio", description: DESCRIPTION },
    () =>
      runTool(async () => {
        const snapshot = await ctx.getSnapshot();
        const { business, window } = snapshot;
        return {
          data: {
            business: {
              name: business.name,
              timezone: business.timezone,
              currency: business.currency,
              points_rule: business.points_rule,
              reward_rule: business.reward_rule,
            },
            locations: snapshot.locations.map((location) => ({
              id: location.id,
              name: location.name,
              opened_at: location.opened_at,
            })),
            segments: snapshot.segments.map((segment) => ({
              id: segment.id,
              definition: segment.description,
              customers: segment.customers,
            })),
            calendar: buildCalendar(window),
          },
          notes: [
            `Las fechas relativas se calculan desde data_as_of (${window.dataAsOf}), no desde la fecha del sistema.`,
            "Montos en MXN; fechas en hora local de America/Mexico_City.",
          ],
          warnings: [],
          source: createSource({
            tool: GET_BUSINESS_CONTEXT,
            params: {},
            endpoints: snapshot.endpoints,
            dataAsOf: window.dataAsOf,
            now: ctx.now,
          }),
        };
      }),
  );
}
