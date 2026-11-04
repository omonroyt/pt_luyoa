import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { previewAudience } from "../api/endpoints";
import { CHANNELS } from "../api/schemas";
import { requireLocation, type ToolContext } from "../context";
import { createSource } from "../source";
import { audienceSchema, channelSchema, type Audience } from "./campaign-schemas";
import { runTool } from "./tool-kit";

export const AUDIENCE_REACH = "audience_reach";

const DESCRIPTION = [
  "Alcance real de una audiencia por canal: cuántos clientes coinciden con los filtros y a",
  "cuántos se puede contactar de verdad (reachable), descontando tarjetas suspendidas,",
  "clientes sin consentimiento en ese canal y tarjetas duplicadas. No guarda nada. Usar",
  "siempre que se diga 'a cuántos puedo contactar' y antes de proponer cualquier campaña.",
].join(" ");

const INPUT = {
  audience: audienceSchema,
  channels: z.array(channelSchema).min(1).optional().describe("Por defecto, los tres canales"),
};

/**
 * ES: Calcula el alcance de una audiencia en uno o varios canales, en paralelo.
 * EN: Computes an audience reach on one or several channels, in parallel.
 */
export async function reachByChannel(
  ctx: ToolContext,
  audience: Audience,
  channels: ReadonlyArray<(typeof CHANNELS)[number]>,
) {
  const previews = await Promise.all(
    channels.map((channel) => previewAudience(ctx.api, channel, audience)),
  );
  const byChannel = previews
    .map((preview) => preview.data)
    .sort((a, b) => b.reachable - a.reachable);
  return { byChannel, endpoints: previews.map((preview) => preview.endpoint) };
}

/**
 * ES: Registra audience_reach (escenarios E-02, E-04, E-06 y caso de ejemplo).
 * EN: Registers audience_reach (scenarios E-02, E-04, E-06 and the example case).
 */
export function registerAudienceReach(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    AUDIENCE_REACH,
    { title: "Alcance real de una audiencia", description: DESCRIPTION, inputSchema: INPUT },
    (args) =>
      runTool(async () => {
        const snapshot = await ctx.getSnapshot();
        if (args.audience.home_location_id) {
          requireLocation(snapshot, args.audience.home_location_id);
        }
        const { byChannel, endpoints } = await reachByChannel(
          ctx,
          args.audience,
          args.channels ?? CHANNELS,
        );
        const matched = byChannel[0]?.matched ?? 0;
        return {
          data: {
            audience: args.audience,
            matched,
            by_channel: byChannel,
            best_channel_by_reach: byChannel[0]?.channel ?? null,
          },
          notes: [
            "reachable es el alcance real: ya descuenta suspendidos, clientes sin consentimiento en el canal y duplicados.",
            "Reportar reachable del canal elegido, no el tamaño de la audiencia (matched).",
          ],
          warnings: matched === 0 ? ["Ningún cliente coincide con estos filtros."] : [],
          source: createSource({
            tool: AUDIENCE_REACH,
            endpoints,
            dataAsOf: snapshot.window.dataAsOf,
            now: ctx.now,
          }),
        };
      }),
  );
}
