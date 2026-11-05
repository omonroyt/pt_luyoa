/**
 * ES: Endpoint del chat (IMP-30): valida el origen y los mensajes de la interfaz, incluidos
 *     los resultados de aprobación, y delega el turno al orquestador del agente, que
 *     responde en streaming.
 * EN: Chat endpoint (IMP-30): validates the origin and the UI messages, including the
 *     approval results, and hands the turn to the agent orchestrator, which responds with
 *     a stream.
 */
import { agentConfig } from "@/lib/agent/agent-config";
import { parseChatRequest } from "@/lib/agent/chat-request";
import { createAgentModel } from "@/lib/agent/model";
import { streamAgentTurn } from "@/lib/agent/run-turn";
import { saveTurn } from "@/lib/agent/trace-store";
import { isSameOrigin } from "@/lib/auth/service-token";
import { getDatabase } from "@/lib/db/client";
import { mcpServerFactory } from "@/lib/mcp/runtime";
import { createDbPreferenceStore, deferredPreferenceStore } from "@/lib/memory/preference-store";
import { currentBusiness } from "@/lib/tenancy/current-business";

// ES: Un turno con varias herramientas puede tardar decenas de segundos.
// EN: A turn with several tools can take tens of seconds.
export const maxDuration = 60;

const errorResponse = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return errorResponse(403, "forbidden", "Origen no permitido.");
  const parsed = await parseChatRequest(await request.json().catch(() => null));
  if (!parsed.ok) {
    return errorResponse(400, "validation_error", "Mensajes del chat inválidos.");
  }
  const business = currentBusiness();
  const agent = agentConfig();
  return streamAgentTurn(parsed.messages, {
    model: createAgentModel({ apiKey: agent.openRouterApiKey, modelId: agent.modelId }),
    mcp: { serviceToken: business.mcpServiceToken, createServer: mcpServerFactory(business) },
    memory: deferredPreferenceStore(async () =>
      createDbPreferenceStore(await getDatabase(), business.id),
    ),
    persist: async (turn) =>
      saveTurn(await getDatabase(), {
        ...turn,
        conversationId: parsed.conversationId,
        businessId: business.id,
      }),
  });
}
