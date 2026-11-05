/**
 * ES: Último resumen semanal guardado del negocio (X-02), para que la interfaz lo ofrezca
 *     al abrir el chat. Solo acepta solicitudes del mismo origen.
 * EN: Latest stored weekly summary of the business (X-02), so the UI offers it when the
 *     chat opens. It only accepts same-origin requests.
 */
import { latestWeeklySummary } from "@/lib/agent/weekly-summary-store";
import { isSameOrigin } from "@/lib/auth/service-token";
import { getDatabase } from "@/lib/db/client";
import { serverConfig } from "@/lib/server-config";

export async function GET(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Response.json(
      { error: { code: "forbidden", message: "Origen no permitido." } },
      { status: 403 },
    );
  }
  const summary = await latestWeeklySummary(await getDatabase(), serverConfig().businessId);
  return Response.json({
    summary: summary
      ? {
          id: summary.id,
          weekEnd: summary.weekEnd,
          createdAt: summary.createdAt.toISOString(),
          messages: summary.messages,
        }
      : null,
  });
}
