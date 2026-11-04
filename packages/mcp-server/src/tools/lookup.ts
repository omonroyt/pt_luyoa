import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchCampaign, fetchCustomer, fetchProducts } from "../api/endpoints";
import type { ToolContext } from "../context";
import { campaignMetrics } from "../domain/campaigns";
import { ToolFailure } from "../errors";
import { createSource } from "../source";
import { runTool } from "./tool-kit";

export const LOOKUP = "lookup";

const DESCRIPTION = [
  "Detalle puntual de un producto (precio y costo), un cliente (segmento, nivel, sucursal,",
  "visitas, gasto, última visita y consentimientos, sin datos personales) o una campaña",
  "(con sus resultados). Usar solo para preguntas sobre un elemento específico por su id.",
].join(" ");

const INPUT = {
  kind: z.enum(["product", "customer", "campaign"]),
  id: z.string().min(1).describe("Id del elemento, p. ej. prd_concha, cus_0001, cmp_0004"),
};

async function findProduct(ctx: ToolContext, id: string) {
  const response = await fetchProducts(ctx.api);
  const product = response.data.data.find((candidate) => candidate.id === id);
  if (!product) {
    throw new ToolFailure({
      code: "not_found",
      message: `No existe el producto ${id}.`,
      suggestion: `Productos válidos: ${response.data.data.map((candidate) => candidate.id).join(", ")}.`,
    });
  }
  return { data: product, endpoint: response.endpoint };
}

async function findCampaign(ctx: ToolContext, id: string) {
  const response = await fetchCampaign(ctx.api, id);
  return { data: campaignMetrics(response.data), endpoint: response.endpoint };
}

const FINDERS = {
  product: findProduct,
  customer: (ctx: ToolContext, id: string) => fetchCustomer(ctx.api, id),
  campaign: findCampaign,
};

/**
 * ES: Registra lookup. Los clientes llegan sin datos personales porque el esquema de la
 *     API no los declara (ver api/schemas.ts).
 * EN: Registers lookup. Customers arrive without personal data because the API schema
 *     does not declare it (see api/schemas.ts).
 */
export function registerLookup(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    LOOKUP,
    { title: "Detalle por id", description: DESCRIPTION, inputSchema: INPUT },
    (args) =>
      runTool(async () => {
        const snapshot = await ctx.getSnapshot();
        const result = await FINDERS[args.kind](ctx, args.id);
        return {
          data: { kind: args.kind, item: result.data },
          notes:
            args.kind === "customer" ? ["Los datos personales del cliente no se exponen."] : [],
          warnings: [],
          source: createSource({
            tool: LOOKUP,
            endpoints: [result.endpoint],
            dataAsOf: snapshot.window.dataAsOf,
            now: ctx.now,
          }),
        };
      }),
  );
}
