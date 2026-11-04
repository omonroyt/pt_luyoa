import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchProducts } from "../api/endpoints";
import type { ToolContext } from "../context";
import { roundTo } from "../domain/metrics";
import { computeOfferEconomics, resolveOfferProduct } from "../domain/offers";
import { createSource } from "../source";
import { loadOfferBaseline } from "./campaign-data";
import { offerSchema } from "./campaign-schemas";
import { runTool } from "./tool-kit";

export const OFFER_ECONOMICS = "offer_economics";

const DESCRIPTION = [
  "Costo de una oferta y su efecto en margen: costo por canje (costo del producto regalado,",
  "descuento sobre el ticket promedio o valor de los puntos extra), utilidad bruta promedio de",
  "una visita y margen restante. Con expected_redemptions calcula el costo total. Usar antes",
  "de recomendar cualquier oferta para no proponer una que destruya margen.",
].join(" ");

const INPUT = {
  offer: offerSchema,
  expected_redemptions: z.number().int().min(1).optional(),
};

/**
 * ES: Registra offer_economics (bonus B-04, trampa T-13).
 * EN: Registers offer_economics (bonus B-04, pitfall T-13).
 */
export function registerOfferEconomics(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    OFFER_ECONOMICS,
    { title: "Economía de una oferta", description: DESCRIPTION, inputSchema: INPUT },
    (args) =>
      runTool(async () => {
        const snapshot = await ctx.getSnapshot();
        const [products, baseline] = await Promise.all([
          fetchProducts(ctx.api),
          loadOfferBaseline(ctx, snapshot),
        ]);
        const product = resolveOfferProduct(args.offer, products.data.data);
        const economics = computeOfferEconomics(args.offer, product, baseline.baseline);
        const totalCost = args.expected_redemptions
          ? roundTo(economics.cost_per_redemption * args.expected_redemptions)
          : null;
        return {
          data: {
            offer: args.offer,
            product_name: product?.name ?? null,
            ...economics,
            total_cost: totalCost,
          },
          notes: [economics.basis, ...economics.assumptions],
          warnings:
            economics.margin_after_offer < 0
              ? ["La oferta cuesta más que la utilidad bruta promedio de una visita."]
              : [],
          source: createSource({
            tool: OFFER_ECONOMICS,
            endpoints: [products.endpoint, baseline.endpoint],
            dataAsOf: snapshot.window.dataAsOf,
            now: ctx.now,
          }),
        };
      }),
  );
}
