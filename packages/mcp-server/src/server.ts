import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpConfig } from "./config";
import { registerTools } from "./tools/index";

export const SERVER_NAME = "cafe-alborada";
export const SERVER_VERSION = "0.1.0";

/**
 * ES: Crea el servidor MCP. El mismo servidor se usa por stdio (CLI) y por HTTP (/api/mcp).
 * EN: Creates the MCP server. The same server is used over stdio (CLI) and HTTP (/api/mcp).
 */
export function createServer(config: McpConfig): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerTools(server, { config });
  return server;
}
