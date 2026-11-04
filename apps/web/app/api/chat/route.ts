/**
 * ES: Endpoint del chat (IMP-30): valida el origen y los mensajes de la interfaz, y
 *     delega el turno al orquestador del agente, que responde en streaming.
 * EN: Chat endpoint (IMP-30): validates the origin and the UI messages, and hands the
 *     turn to the agent orchestrator, which responds with a stream.
 */
import { safeValidateUIMessages } from "ai";
import { agentConfig } from "@/lib/agent/agent-config";
import { createAgentModel } from "@/lib/agent/model";
import { streamAgentTurn } from "@/lib/agent/run-turn";
import { isSameOrigin } from "@/lib/auth/service-token";
import { mcpServerFactory } from "@/lib/mcp/runtime";
import { serverConfig } from "@/lib/server-config";

// ES: Un turno con varias herramientas puede tardar decenas de segundos.
// EN: A turn with several tools can take tens of seconds.
export const maxDuration = 60;

const errorResponse = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return errorResponse(403, "forbidden", "Origen no permitido.");
  const body = (await request.json().catch(() => null)) as { messages?: unknown } | null;
  const validated = await safeValidateUIMessages({ messages: body?.messages });
  if (!validated.success) {
    return errorResponse(400, "validation_error", "Mensajes del chat inválidos.");
  }
  const config = serverConfig();
  const agent = agentConfig();
  return streamAgentTurn(validated.data, {
    model: createAgentModel({ apiKey: agent.openRouterApiKey, modelId: agent.modelId }),
    mcp: { serviceToken: config.mcpServiceToken, createServer: mcpServerFactory() },
  });
}
