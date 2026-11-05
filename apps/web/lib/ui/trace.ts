/**
 * ES: Lógica del panel de trazas (IMP-43, CA-Q05, CA-Q06): lectura de /api/traces, totales
 *     del turno calculados de los pasos guardados (un turno con aprobación llega en dos
 *     solicitudes, y los pasos de ambas viven en el mismo mensaje) y formatos.
 * EN: Trace panel logic (IMP-43, CA-Q05, CA-Q06): reading /api/traces, turn totals computed
 *     from the stored steps (a turn with an approval arrives in two requests, and the steps
 *     of both live in the same message) and formats.
 */
import { z } from "zod";

const TraceStep = z.object({
  kind: z.enum(["llm", "tool", "presentation", "approval"]),
  name: z.string(),
  reason: z.string().nullable(),
  input: z.unknown(),
  outputSummary: z.unknown(),
  latencyMs: z.number().nullable(),
  tokensIn: z.number().nullable(),
  tokensOut: z.number().nullable(),
  costUsd: z.number().nullable(),
  errorCode: z.string().nullable(),
});
export type TraceStep = z.infer<typeof TraceStep>;

const TraceResponse = z.object({
  steps: z.array(TraceStep),
  conversationCostUsd: z.number().nullable(),
});
export type TraceResponse = z.infer<typeof TraceResponse>;

export async function fetchTrace(
  conversation: string,
  message: string,
  fetcher: typeof fetch = fetch,
): Promise<TraceResponse> {
  const query = new URLSearchParams({ conversation, message });
  const response = await fetcher(`/api/traces?${query.toString()}`);
  const parsed = TraceResponse.safeParse(await response.json().catch(() => null));
  if (!response.ok || !parsed.success) throw new Error("No se pudo leer la traza.");
  return parsed.data;
}

// ES: La traza se guarda justo después de que termina el stream; si aún no aparece, se
//     vuelve a pedir una vez tras una pausa corta.
// EN: The trace is stored right after the stream ends; if it is not there yet, it is
//     requested once more after a short pause.
export const RETRY_DELAY_MS = 1500;

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function fetchStoredTrace(
  conversation: string,
  message: string,
  {
    fetcher = fetch,
    wait = pause,
  }: { fetcher?: typeof fetch; wait?: (ms: number) => Promise<void> } = {},
): Promise<TraceResponse> {
  const first = await fetchTrace(conversation, message, fetcher);
  if (first.steps.length > 0) return first;
  await wait(RETRY_DELAY_MS);
  return fetchTrace(conversation, message, fetcher);
}

export type TraceTotals = {
  model: string | undefined;
  llmCalls: number;
  toolCalls: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
};

const sum = (steps: TraceStep[], pick: (step: TraceStep) => number | null) =>
  steps.reduce((total, step) => total + (pick(step) ?? 0), 0);

export function traceTotals(steps: TraceStep[]): TraceTotals {
  const llm = steps.filter((step) => step.kind === "llm");
  return {
    model: llm.at(-1)?.name,
    llmCalls: llm.length,
    toolCalls: steps.length - llm.length,
    tokensIn: sum(llm, (step) => step.tokensIn),
    tokensOut: sum(llm, (step) => step.tokensOut),
    costUsd: sum(llm, (step) => step.costUsd),
    latencyMs: sum(steps, (step) => step.latencyMs),
  };
}

const MS_PER_SECOND = 1000;
const TOKENS_PER_K = 1000;

export function formatMs(ms: number): string {
  return ms < MS_PER_SECOND ? `${Math.round(ms)} ms` : `${(ms / MS_PER_SECOND).toFixed(1)} s`;
}

export function formatTokens(tokens: number): string {
  return tokens < TOKENS_PER_K ? String(tokens) : `${(tokens / TOKENS_PER_K).toFixed(1)}k`;
}

export function formatUsd(usd: number): string {
  return `${usd.toFixed(4)} USD`;
}

export const KIND_LABELS: Record<TraceStep["kind"], string> = {
  llm: "Modelo",
  tool: "Consulta",
  presentation: "Visual",
  approval: "Aprobación",
};

// ES: Errores del agente en lenguaje claro; los del MCP se muestran con su código.
// EN: Agent errors in plain language; MCP errors are shown with their code.
const ERROR_LABELS: Record<string, string> = {
  figure_verification: "Cifras sin respaldo en sus fuentes; el agente lo corrigió",
  invalid_input: "Argumentos inválidos; el agente lo corrigió",
  execution_error: "Falló al ejecutarse",
};

export function errorLabel(code: string): string {
  return ERROR_LABELS[code] ?? `Error del MCP: ${code}`;
}
