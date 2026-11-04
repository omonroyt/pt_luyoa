import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../context";
import { registerComparePeriods } from "./compare-periods";
import { registerGetBusinessContext } from "./get-business-context";
import { registerSalesBreakdown } from "./sales-breakdown";
import { registerVisitsBreakdown } from "./visits-breakdown";

/**
 * ES: Registra las herramientas del MCP. Cada herramienta vive en su propio archivo;
 *     el catálogo está en docs/specs/05_DISENO_MCP.md §4.
 * EN: Registers the MCP tools. Each tool lives in its own file; the catalog is in
 *     docs/specs/05_DISENO_MCP.md §4.
 */
export function registerTools(server: McpServer, ctx: ToolContext): void {
  registerGetBusinessContext(server, ctx);
  registerComparePeriods(server, ctx);
  registerSalesBreakdown(server, ctx);
  registerVisitsBreakdown(server, ctx);
}
