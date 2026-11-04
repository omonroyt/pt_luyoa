import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpConfig } from "../config";

export type ToolContext = {
  config: McpConfig;
};

/**
 * ES: Registra las herramientas del MCP. Cada herramienta vive en su propio archivo
 *     de esta carpeta; el catálogo se define en docs/specs/05_DISENO_MCP.md
 *     (pendiente de la exploración de la API).
 * EN: Registers the MCP tools. Each tool lives in its own file in this folder;
 *     the catalog is defined in docs/specs/05_DISENO_MCP.md (pending the API
 *     exploration).
 */
export function registerTools(_server: McpServer, _ctx: ToolContext): void {
  // ES: Aún sin herramientas.
  // EN: No tools yet.
}
