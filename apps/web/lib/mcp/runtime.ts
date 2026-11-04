/**
 * ES: Piezas de servidor compartidas por las rutas: la fábrica de servidores MCP con el
 *     almacén de aprobaciones persistente y la configuración del entorno.
 * EN: Server pieces shared by the routes: the MCP server factory with the persistent
 *     approval store and the environment configuration.
 */
import { createServerFactory, type ApprovalStore } from "@alborada/mcp-server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createDatabaseApprovalStore } from "../approvals/db-approval-store";
import { getDatabase } from "../db/client";
import { serverConfig } from "../server-config";

// ES: El almacén abre la base de datos al primer uso, no al importar el módulo.
// EN: The store opens the database on first use, not when the module is imported.
export const approvalStore: ApprovalStore = {
  save: async (record) => createDatabaseApprovalStore(await getDatabase()).save(record),
  consume: async (approvalId) =>
    createDatabaseApprovalStore(await getDatabase()).consume(approvalId),
};

let factory: (() => McpServer) | undefined;

export function mcpServerFactory(): () => McpServer {
  const config = serverConfig();
  factory ??= createServerFactory(
    { apiKey: config.apiKey, apiBaseUrl: config.apiBaseUrl },
    { approvals: { secret: config.approvalSecret, store: approvalStore } },
  );
  return factory;
}
