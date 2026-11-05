/**
 * ES: Lectura del último resumen semanal guardado (X-02) desde la interfaz, contra
 *     /api/weekly-summary. Se valida la forma antes de cargarlo como mensajes del chat; los
 *     bloques se vuelven a validar al dibujarse, como cualquier mensaje.
 * EN: Reading the latest stored weekly summary (X-02) from the UI, against
 *     /api/weekly-summary. The shape is validated before loading it as chat messages; the
 *     blocks are validated again when drawn, like any message.
 */
import type { UIMessage } from "ai";
import { z } from "zod";

const StoredMessage = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.object({ type: z.string() }).passthrough()),
});

const SummaryResponse = z.object({
  summary: z
    .object({
      id: z.string(),
      weekEnd: z.string(),
      createdAt: z.string(),
      messages: z.array(StoredMessage).min(2),
    })
    .nullable(),
});

export type StoredSummary = {
  id: string;
  weekEnd: string;
  createdAt: string;
  messages: UIMessage[];
};

export async function fetchLatestSummary(
  fetcher: typeof fetch = fetch,
): Promise<StoredSummary | null> {
  const response = await fetcher("/api/weekly-summary");
  const parsed = SummaryResponse.safeParse(await response.json().catch(() => null));
  if (!response.ok || !parsed.success) throw new Error("No se pudo leer el resumen semanal.");
  const summary = parsed.data.summary;
  return summary ? { ...summary, messages: summary.messages as UIMessage[] } : null;
}
