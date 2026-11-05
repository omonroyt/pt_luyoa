/**
 * ES: Preferencias guardadas del negocio (X-04, 06_DISENO_AGENTE §12.2): la interfaz las
 *     lista y la dueña puede borrar cualquiera. Solo acepta solicitudes del mismo origen y
 *     solo toca las preferencias de este negocio.
 * EN: Stored business preferences (X-04, 06_DISENO_AGENTE §12.2): the UI lists them and
 *     the owner can delete any of them. It only accepts same-origin requests and only
 *     touches this business's preferences.
 */
import { isSameOrigin } from "@/lib/auth/service-token";
import { getDatabase } from "@/lib/db/client";
import { createDbPreferenceStore } from "@/lib/memory/preference-store";
import { PREFERENCE_LABELS, PreferenceKeySchema } from "@/lib/memory/preferences";
import { serverConfig } from "@/lib/server-config";

const errorResponse = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

async function businessStore() {
  return createDbPreferenceStore(await getDatabase(), serverConfig().businessId);
}

export async function GET(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return errorResponse(403, "forbidden", "Origen no permitido.");
  const saved = await (await businessStore()).list();
  return Response.json({
    preferences: saved.map((preference) => ({
      key: preference.key,
      label: PREFERENCE_LABELS[preference.key],
      value: preference.value,
      updatedAt: preference.updatedAt.toISOString(),
    })),
  });
}

export async function DELETE(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return errorResponse(403, "forbidden", "Origen no permitido.");
  const key = PreferenceKeySchema.safeParse(new URL(request.url).searchParams.get("key"));
  if (!key.success) return errorResponse(400, "validation_error", "Preferencia inválida.");
  const removed = await (await businessStore()).remove(key.data);
  return removed
    ? Response.json({ removed: true, key: key.data })
    : errorResponse(404, "not_found", "Esa preferencia no está guardada.");
}
