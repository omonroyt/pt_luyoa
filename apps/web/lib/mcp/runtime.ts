/**
 * ES: Piezas de servidor compartidas por las rutas: el almacén de aprobaciones persistente y
 *     una fábrica de servidores MCP por negocio (X-05). Cada fábrica tiene su propio cliente
 *     de la API, con su llave, su caché y su límite de solicitudes: la caché se indexa por
 *     dirección, sin la llave, así que compartirla entregaría datos de un negocio a otro.
 * EN: Server pieces shared by the routes: the persistent approval store and one MCP server
 *     factory per business (X-05). Each factory has its own API client, with its key, cache
 *     and rate limit: the cache is keyed by URL, without the key, so sharing it would hand
 *     one business's data to another.
 */
import { createServerFactory, type ApprovalStore } from "@alborada/mcp-server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createDatabaseApprovalStore } from "../approvals/db-approval-store";
import { getDatabase } from "../db/client";
import { serverConfig } from "../server-config";
import type { BusinessConfig } from "../tenancy/business-registry";

// ES: El almacén abre la base de datos al primer uso, no al importar el módulo.
// EN: The store opens the database on first use, not when the module is imported.
export const approvalStore: ApprovalStore = {
  save: async (record) => createDatabaseApprovalStore(await getDatabase()).save(record),
  consume: async (approvalId) =>
    createDatabaseApprovalStore(await getDatabase()).consume(approvalId),
};

const factories = new Map<string, () => McpServer>();

export function mcpServerFactory(business: BusinessConfig): () => McpServer {
  const existing = factories.get(business.id);
  if (existing) return existing;
  const config = serverConfig();
  const factory = createServerFactory(
    { apiKey: business.apiKey, apiBaseUrl: config.apiBaseUrl, businessId: business.id },
    { approvals: { secret: config.approvalSecret, store: approvalStore } },
  );
  factories.set(business.id, factory);
  return factory;
}
