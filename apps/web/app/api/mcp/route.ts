/**
 * ES: Endpoint HTTP del servidor MCP (ADR-04), protegido con MCP_SERVICE_TOKEN.
 * EN: MCP server HTTP endpoint (ADR-04), protected with MCP_SERVICE_TOKEN.
 */
import { handleMcpRequest } from "@/lib/mcp/handle-mcp-request";
import { mcpServerFactory } from "@/lib/mcp/runtime";
import { serverConfig } from "@/lib/server-config";

const handle = (request: Request): Promise<Response> =>
  handleMcpRequest(request, {
    serviceToken: serverConfig().mcpServiceToken,
    createServer: mcpServerFactory(),
  });

export { handle as DELETE, handle as GET, handle as POST };
