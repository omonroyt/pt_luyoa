import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createApiClient } from "./api/http-client";
import type { McpConfig } from "./config";
import { createToolContext, type ApprovalSettings } from "./context";
import { registerTools } from "./tools/index";

export const SERVER_NAME = "cafe-alborada";
export const SERVER_VERSION = "0.1.0";

export type ServerDependencies = {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  approvals?: ApprovalSettings;
};

/**
 * ES: Crea el servidor MCP. El mismo servidor se usa por stdio (CLI) y por HTTP
 *     (/api/mcp). Las dependencias se inyectan para probarlo sin red. Sin aprobaciones
 *     inyectadas (caso del CLI) las herramientas de escritura quedan deshabilitadas.
 * EN: Creates the MCP server. The same server is used over stdio (CLI) and HTTP
 *     (/api/mcp). Dependencies are injected so it can be tested without network.
 *     Without injected approvals (the CLI case) the write tools stay disabled.
 */
export function createServer(config: McpConfig, dependencies: ServerDependencies = {}): McpServer {
  return createServerFactory(config, dependencies)();
}

/**
 * ES: Fábrica de servidores que comparten cliente de API, caché y contexto. En HTTP sin
 *     sesión se crea un servidor por solicitud; compartir el contexto conserva la caché.
 * EN: Factory of servers sharing the API client, cache and context. Over sessionless
 *     HTTP one server is created per request; sharing the context keeps the cache.
 */
export function createServerFactory(
  config: McpConfig,
  dependencies: ServerDependencies = {},
): () => McpServer {
  const api = createApiClient({
    baseUrl: config.apiBaseUrl,
    apiKey: config.apiKey,
    fetchImpl: dependencies.fetchImpl,
  });
  const ctx = createToolContext(api, { now: dependencies.now, approvals: dependencies.approvals });
  return () => {
    const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
    registerTools(server, ctx);
    return server;
  };
}
