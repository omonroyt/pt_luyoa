import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createApiClient } from "./api/http-client";
import type { McpConfig } from "./config";
import { createToolContext } from "./context";
import { registerTools } from "./tools/index";

export const SERVER_NAME = "cafe-alborada";
export const SERVER_VERSION = "0.1.0";

export type ServerDependencies = {
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

/**
 * ES: Crea el servidor MCP. El mismo servidor se usa por stdio (CLI) y por HTTP
 *     (/api/mcp). Las dependencias se inyectan para probarlo sin red.
 * EN: Creates the MCP server. The same server is used over stdio (CLI) and HTTP
 *     (/api/mcp). Dependencies are injected so it can be tested without network.
 */
export function createServer(config: McpConfig, dependencies: ServerDependencies = {}): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const api = createApiClient({
    baseUrl: config.apiBaseUrl,
    apiKey: config.apiKey,
    fetchImpl: dependencies.fetchImpl,
  });
  registerTools(server, createToolContext(api, dependencies.now));
  return server;
}
