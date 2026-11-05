/**
 * ES: Cron del resumen semanal (X-02, IMP-60). Vercel Cron lo llama con
 *     Authorization: Bearer CRON_SECRET; sin ese secreto configurado, la ruta no corre.
 *     Genera el resumen con el agente y lo guarda para el negocio de la sesión.
 * EN: Weekly summary cron (X-02, IMP-60). Vercel Cron calls it with Authorization: Bearer
 *     CRON_SECRET; without that secret configured, the route does not run. It generates
 *     the summary with the agent and stores it for the session's business.
 */
import { agentConfig } from "@/lib/agent/agent-config";
import { createAgentModel } from "@/lib/agent/model";
import { generateWeeklySummary } from "@/lib/agent/weekly-summary";
import { saveWeeklySummary } from "@/lib/agent/weekly-summary-store";
import { hasValidBearerToken } from "@/lib/auth/service-token";
import { getDatabase } from "@/lib/db/client";
import { mcpServerFactory } from "@/lib/mcp/runtime";
import { createDbPreferenceStore } from "@/lib/memory/preference-store";
import { serverConfig } from "@/lib/server-config";

// ES: El resumen consulta 4 o 5 herramientas; cabe en el mismo límite que un turno del chat.
// EN: The summary queries 4 or 5 tools; it fits in the same limit as a chat turn.
export const maxDuration = 60;

const errorResponse = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

export async function GET(request: Request): Promise<Response> {
  const config = serverConfig();
  if (!config.cronSecret) {
    return errorResponse(503, "not_configured", "El cron del resumen no está configurado.");
  }
  if (!hasValidBearerToken(request, config.cronSecret)) {
    return errorResponse(401, "unauthorized", "Credenciales del cron inválidas.");
  }
  const agent = agentConfig();
  const db = await getDatabase();
  try {
    const summary = await generateWeeklySummary({
      model: createAgentModel({ apiKey: agent.openRouterApiKey, modelId: agent.modelId }),
      mcp: { serviceToken: config.mcpServiceToken, createServer: mcpServerFactory() },
      memory: createDbPreferenceStore(db, config.businessId),
    });
    const id = await saveWeeklySummary(db, config.businessId, summary);
    return Response.json({ id, weekEnd: summary.weekEnd });
  } catch (error) {
    console.error(
      "No se pudo generar el resumen semanal:",
      error instanceof Error ? error.message : "error desconocido",
    );
    return errorResponse(502, "summary_failed", "No se pudo generar el resumen semanal.");
  }
}
