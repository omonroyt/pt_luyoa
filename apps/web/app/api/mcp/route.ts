/**
 * ES: Endpoint HTTP del servidor MCP (ADR-04). El token de servicio identifica al negocio
 *     (X-05): cada negocio tiene el suyo y se atiende con su propio servidor MCP.
 * EN: MCP server HTTP endpoint (ADR-04). The service token identifies the business (X-05):
 *     each business has its own and is served by its own MCP server.
 */
import { handleMcpRequest, unauthorizedMcpResponse } from "@/lib/mcp/handle-mcp-request";
import { mcpServerFactory } from "@/lib/mcp/runtime";
import { businessForServiceToken } from "@/lib/tenancy/current-business";

const handle = (request: Request): Promise<Response> => {
  const business = businessForServiceToken(request);
  if (!business) return Promise.resolve(unauthorizedMcpResponse());
  return handleMcpRequest(request, {
    serviceToken: business.mcpServiceToken,
    createServer: mcpServerFactory(business),
  });
};

export { handle as DELETE, handle as GET, handle as POST };
