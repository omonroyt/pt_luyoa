/**
 * ES: Atiende una solicitud MCP por HTTP (Streamable HTTP sin sesión): valida el token de
 *     servicio, crea un servidor desde la fábrica compartida y responde con JSON.
 * EN: Handles an MCP request over HTTP (sessionless Streamable HTTP): validates the
 *     service token, creates a server from the shared factory and replies with JSON.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { hasValidBearerToken } from "../auth/service-token";

export type McpRequestDependencies = {
  serviceToken: string;
  createServer: () => McpServer;
};

const unauthorized = () =>
  Response.json(
    { error: { code: "unauthorized", message: "Token de servicio MCP ausente o inválido." } },
    { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
  );

export async function handleMcpRequest(
  request: Request,
  dependencies: McpRequestDependencies,
): Promise<Response> {
  if (!hasValidBearerToken(request, dependencies.serviceToken)) return unauthorized();
  const server = dependencies.createServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
}
