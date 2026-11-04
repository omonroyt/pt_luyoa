import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../context";
import { registerAudienceReach } from "./audience-reach";
import { registerCampaignPerformance } from "./campaign-performance";
import { registerComparePeriods } from "./compare-periods";
import { registerCustomerSegments } from "./customer-segments";
import { registerEstimateCampaignImpact } from "./estimate-campaign-impact";
import { registerGetBusinessContext } from "./get-business-context";
import { registerLocationHealth } from "./location-health";
import { registerLookup } from "./lookup";
import { registerOfferEconomics } from "./offer-economics";
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
  registerLocationHealth(server, ctx);
  registerCustomerSegments(server, ctx);
  registerAudienceReach(server, ctx);
  registerCampaignPerformance(server, ctx);
  registerOfferEconomics(server, ctx);
  registerEstimateCampaignImpact(server, ctx);
  registerLookup(server, ctx);
}
