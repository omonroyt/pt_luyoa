/**
 * ES: Traduce el error de un turno del chat a lo que ve la persona. El transporte del AI SDK
 *     entrega como mensaje el cuerpo de la respuesta; si es un error de la API con código,
 *     se muestra su texto. Los topes de la demo y la sesión vencida no se resuelven con
 *     "Reintentar", así que no lo ofrecen.
 * EN: Translates a chat turn error into what the person sees. The AI SDK transport passes
 *     the response body as the message; if it is an API error with a code, its text is
 *     shown. Demo caps and an expired session are not solved by "Reintentar", so they do
 *     not offer it.
 */
export type ChatErrorView = { message: string; retryable: boolean; needsAccess: boolean };

const FINAL_CODES = new Set(["rate_limited", "budget_exhausted", "unauthorized"]);

const GENERIC: ChatErrorView = {
  message: "No pude completar la respuesta. ¿Lo intento de nuevo?",
  retryable: true,
  needsAccess: false,
};

export function chatErrorView(error: Error | undefined): ChatErrorView {
  if (!error) return GENERIC;
  try {
    const body = JSON.parse(error.message) as { error?: { code?: string; message?: string } };
    const code = body.error?.code ?? "";
    if (!body.error?.message || !FINAL_CODES.has(code)) return GENERIC;
    return { message: body.error.message, retryable: false, needsAccess: code === "unauthorized" };
  } catch {
    return GENERIC;
  }
}
