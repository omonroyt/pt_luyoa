/**
 * ES: Cliente MCP del agente (ADR-04, ADR-06). Habla el protocolo MCP real contra el
 *     manejador de /api/mcp, con el token de servicio, pero dentro del mismo proceso: el
 *     fetch del cliente entrega la solicitud al manejador sin pasar por la red. Así no
 *     hace falta conocer la URL pública del despliegue y se evita un salto HTTP.
 * EN: Agent MCP client (ADR-04, ADR-06). It speaks the real MCP protocol against the
 *     /api/mcp handler, with the service token, but in the same process: the client
 *     fetch hands the request to the handler without going through the network. No
 *     public deployment URL is needed and an HTTP hop is avoided.
 */
import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { handleMcpRequest } from "../mcp/handle-mcp-request";

// ES: Origen interno: el manejador solo usa la ruta y los encabezados.
// EN: Internal origin: the handler only uses the path and headers.
const IN_PROCESS_URL = "http://in-process/api/mcp";

export type McpConnection = {
  serviceToken: string;
  createServer: () => McpServer;
};

export function connectMcpClient(connection: McpConnection): Promise<MCPClient> {
  const inProcessFetch = (input: RequestInfo | URL, init?: RequestInit) =>
    handleMcpRequest(new Request(input, init), connection);
  return createMCPClient({
    transport: {
      type: "http",
      url: IN_PROCESS_URL,
      headers: { Authorization: `Bearer ${connection.serviceToken}` },
      fetch: inProcessFetch,
    },
  });
}
