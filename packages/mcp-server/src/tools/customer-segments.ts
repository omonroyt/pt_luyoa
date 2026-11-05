import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { countCustomers } from "../api/endpoints";
import { SEGMENT_IDS } from "../api/schemas";
import { requireLocation, type BusinessSnapshot, type ToolContext } from "../context";
import { createSource } from "../source";
import { segmentIdSchema } from "./campaign-schemas";
import { locationIdSchema, runTool } from "./tool-kit";

export const CUSTOMER_SEGMENTS = "customer_segments";

const DESCRIPTION = [
  "Tamaño y definición de los segmentos de clientes calculados a la fecha de corte",
  "(new, dormant, at_risk, champions, regulars, occasional), con gasto promedio y tasa de",
  "consentimiento por canal. Con home_location_id cuenta los clientes de esa sucursal de",
  "origen. Usar para '¿qué clientes estoy perdiendo?' (at_risk y dormant) o para dimensionar",
  "una audiencia antes de calcular su alcance real con audience_reach.",
].join(" ");

const INPUT = {
  segment_ids: z.array(segmentIdSchema).min(1).optional(),
  home_location_id: locationIdSchema.optional(),
};

function fromSegmentsEndpoint(snapshot: BusinessSnapshot, segmentIds: readonly string[]) {
  return snapshot.segments
    .filter((segment) => segmentIds.includes(segment.id))
    .map((segment) => ({
      id: segment.id,
      definition: segment.description,
      customers: segment.customers,
      avg_spend: segment.avg_spend,
      consent_rates: {
        push: segment.push_consent_rate,
        whatsapp: segment.whatsapp_consent_rate,
        email: segment.email_consent_rate,
      },
    }));
}

async function countByLocation(
  ctx: ToolContext,
  snapshot: BusinessSnapshot,
  segmentIds: readonly string[],
  locationId: string,
) {
  const counts = await Promise.all(
    segmentIds.map((segment) => countCustomers(ctx.api, { segment, home_location_id: locationId })),
  );
  const segments = segmentIds.map((id, index) => ({
    id,
    definition: snapshot.segments.find((segment) => segment.id === id)?.description ?? id,
    customers: counts[index]?.data ?? 0,
  }));
  return { segments, endpoints: counts.map((count) => count.endpoint) };
}

/**
 * ES: Registra customer_segments (escenario E-04).
 * EN: Registers customer_segments (scenario E-04).
 */
export function registerCustomerSegments(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    CUSTOMER_SEGMENTS,
    { title: "Segmentos de clientes", description: DESCRIPTION, inputSchema: INPUT },
    (args) =>
      runTool(async () => {
        const snapshot = await ctx.getSnapshot();
        const segmentIds = args.segment_ids ?? [...SEGMENT_IDS];
        const location = args.home_location_id
          ? requireLocation(snapshot, args.home_location_id)
          : undefined;
        const result = location
          ? await countByLocation(ctx, snapshot, segmentIds, location.id)
          : { segments: fromSegmentsEndpoint(snapshot, segmentIds), endpoints: snapshot.endpoints };
        // ES: Los segmentos son excluyentes (cada cliente pertenece a uno solo; los seis suman
        //     el total de clientes), así que el total de los pedidos es una suma válida. Se
        //     entrega calculado para que el agente no sume (ADR-09).
        // EN: Segments are mutually exclusive (each customer belongs to exactly one; the six
        //     add up to the customer total), so the total of the requested ones is a valid
        //     sum. It is returned precomputed so the agent does not add (ADR-09).
        const totalCustomers = result.segments.reduce((sum, segment) => sum + segment.customers, 0);
        return {
          data: {
            home_location: location?.name ?? null,
            segments: result.segments,
            total_customers: totalCustomers,
          },
          notes: [
            `Segmentos calculados a la fecha de corte (${snapshot.window.dataAsOf}).`,
            "total_customers suma los segmentos pedidos; los segmentos son excluyentes.",
            "El tamaño del segmento no es el alcance: para saber a cuántos se puede contactar usar audience_reach.",
          ],
          warnings: location
            ? [
                "Los conteos por sucursal se obtienen de /v1/customers porque /v1/segments no filtra por sucursal.",
              ]
            : [],
          source: createSource({
            tool: CUSTOMER_SEGMENTS,
            params: args,
            endpoints: result.endpoints,
            dataAsOf: snapshot.window.dataAsOf,
            now: ctx.now,
          }),
        };
      }),
  );
}
