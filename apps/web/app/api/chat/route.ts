/**
 * ES: Endpoint del chat (IMP-30): valida el origen y los mensajes de la interfaz, incluidos
 *     los resultados de aprobación, y delega el turno al orquestador del agente, que
 *     responde en streaming. En la demo publicada (IMP-63) exige una sesión válida y revisa
 *     los topes de gasto y de turnos antes de llamar al modelo.
 * EN: Chat endpoint (IMP-30): validates the origin and the UI messages, including the
 *     approval results, and hands the turn to the agent orchestrator, which responds with
 *     a stream. In the published demo (IMP-63) it requires a valid session and checks the
 *     spend and turn caps before calling the model.
 */
import { agentConfig } from "@/lib/agent/agent-config";
import { parseChatRequest } from "@/lib/agent/chat-request";
import { createAgentModel } from "@/lib/agent/model";
import { streamAgentTurn } from "@/lib/agent/run-turn";
import { saveTurn } from "@/lib/agent/trace-store";
import { clientIp, hashIp, type DemoSession } from "@/lib/auth/demo-session";
import { isSameOrigin } from "@/lib/auth/service-token";
import { getDatabase } from "@/lib/db/client";
import { checkTurnAllowed, demoLimits, type LimitVerdict } from "@/lib/demo/demo-limits";
import { mcpServerFactory } from "@/lib/mcp/runtime";
import { createDbPreferenceStore, deferredPreferenceStore } from "@/lib/memory/preference-store";
import { serverConfig } from "@/lib/server-config";
import { businessForRequest, sessionRequiredResponse } from "@/lib/tenancy/current-business";

// ES: Un turno con varias herramientas puede tardar decenas de segundos.
// EN: A turn with several tools can take tens of seconds.
export const maxDuration = 60;

const errorResponse = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

async function demoVerdict(request: Request, session: DemoSession | null): Promise<LimitVerdict> {
  if (!session) return { ok: true };
  return checkTurnAllowed(await getDatabase(), {
    sessionId: session.sessionId,
    ipHash: hashIp(clientIp(request), serverConfig().approvalSecret),
    limits: demoLimits(),
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return errorResponse(403, "forbidden", "Origen no permitido.");
  const parsed = await parseChatRequest(await request.json().catch(() => null));
  if (!parsed.ok) {
    return errorResponse(400, "validation_error", "Mensajes del chat inválidos.");
  }
  const resolved = businessForRequest(request);
  if (!resolved) return sessionRequiredResponse();
  const verdict = await demoVerdict(request, resolved.session);
  if (!verdict.ok) return errorResponse(429, verdict.code, verdict.message);
  const { business } = resolved;
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
