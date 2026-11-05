/**
 * ES: Lectura y borrado de las preferencias guardadas desde la interfaz (X-04), contra
 *     /api/preferences. La respuesta se valida antes de mostrarse.
 * EN: Reading and deleting stored preferences from the UI (X-04), against
 *     /api/preferences. The response is validated before it is shown.
 */
import { z } from "zod";

const SavedPreference = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
  updatedAt: z.string(),
});
export type SavedPreference = z.infer<typeof SavedPreference>;

const PreferencesResponse = z.object({ preferences: z.array(SavedPreference) });

export async function fetchPreferences(fetcher: typeof fetch = fetch): Promise<SavedPreference[]> {
  const response = await fetcher("/api/preferences");
  const parsed = PreferencesResponse.safeParse(await response.json().catch(() => null));
  if (!response.ok || !parsed.success) throw new Error("No se pudieron leer las preferencias.");
  return parsed.data.preferences;
}

export async function forgetPreference(key: string, fetcher: typeof fetch = fetch): Promise<void> {
  const response = await fetcher(`/api/preferences?${new URLSearchParams({ key }).toString()}`, {
    method: "DELETE",
  });
  // ES: Si ya no estaba guardada (404), el resultado para la persona es el mismo.
  // EN: If it was no longer stored (404), the outcome for the person is the same.
  if (!response.ok && response.status !== 404) throw new Error("No se pudo borrar la preferencia.");
}
