/**
 * ES: Traza de un mensaje del asistente para el panel de trazas (IMP-43). Solo acepta
 *     solicitudes del mismo origen y solo lee conversaciones de este negocio.
 * EN: Trace of an assistant message for the trace panel (IMP-43). It only accepts
 *     same-origin requests and only reads this business's conversations.
 */
import { readConversationCost, readMessageTrace, TraceQuery } from "@/lib/agent/trace-reader";
import { isSameOrigin } from "@/lib/auth/service-token";
import { getDatabase } from "@/lib/db/client";
import { serverConfig } from "@/lib/server-config";

const errorResponse = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

export async function GET(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return errorResponse(403, "forbidden", "Origen no permitido.");
  const params = new URL(request.url).searchParams;
  const query = TraceQuery.safeParse({
    conversation: params.get("conversation"),
    message: params.get("message"),
  });
  if (!query.success) {
    return errorResponse(400, "validation_error", "Conversación o mensaje inválidos.");
  }
  const db = await getDatabase();
  const { businessId } = serverConfig();
  const [steps, conversationCostUsd] = await Promise.all([
    readMessageTrace(db, businessId, query.data),
    readConversationCost(db, businessId, query.data.conversation),
  ]);
  return Response.json({ steps, conversationCostUsd });
}
