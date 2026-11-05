/**
 * ES: Cron del resumen semanal (X-02, IMP-60). Vercel Cron lo llama con
 *     Authorization: Bearer CRON_SECRET; sin ese secreto configurado, la ruta no corre.
 *     Genera y guarda un resumen por cada negocio registrado (X-05), cada uno con su propio
 *     servidor MCP y su propia memoria. Responde 502 solo si fallaron todos.
 * EN: Weekly summary cron (X-02, IMP-60). Vercel Cron calls it with Authorization: Bearer
 *     CRON_SECRET; without that secret configured, the route does not run. It generates and
 *     stores one summary per registered business (X-05), each with its own MCP server and
 *     memory. It answers 502 only if all of them failed.
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
import { forEachBusiness } from "@/lib/tenancy/for-each-business";

// ES: Los negocios corren en paralelo; cada resumen cabe en el límite de un turno del chat.
// EN: Businesses run in parallel; each summary fits in the limit of a chat turn.
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
  const results = await forEachBusiness(config.businesses, async (business) => {
    const summary = await generateWeeklySummary({
      model: createAgentModel({ apiKey: agent.openRouterApiKey, modelId: agent.modelId }),
      mcp: { serviceToken: business.mcpServiceToken, createServer: mcpServerFactory(business) },
      memory: createDbPreferenceStore(db, business.id),
    });
    const id = await saveWeeklySummary(db, business.id, summary);
    return { id, weekEnd: summary.weekEnd };
  });
  if (results.every((result) => !result.ok)) {
    return errorResponse(502, "summary_failed", "No se pudo generar el resumen semanal.");
  }
  return Response.json({ results });
}
