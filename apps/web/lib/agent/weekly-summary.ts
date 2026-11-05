/**
 * ES: Resumen semanal proactivo (X-02, IMP-60, 06_DISENO_AGENTE §12.1). El cron corre un
 *     turno del mismo agente con la pregunta del resumen y guarda la conversación (la
 *     pregunta y la respuesta) para mostrarla al abrir el chat. Como son mensajes normales,
 *     la persona puede seguir preguntando sobre el resumen y sus fuentes se verifican
 *     igual. Un turno con errores o sin texto no se guarda.
 * EN: Proactive weekly summary (X-02, IMP-60, 06_DISENO_AGENTE §12.1). The cron runs a turn
 *     of the same agent with the summary question and stores the conversation (question
 *     and answer) to show it when the chat opens. Since they are regular messages, the
 *     person can keep asking about the summary and its sources are verified the same way.
 *     A turn with errors or without text is not stored.
 */
import type { UIMessage } from "ai";
import { collectAgentMessage } from "./collect-message";
import { streamAgentTurn, type TurnDependencies } from "./run-turn";
import { WEEKLY_SUMMARY_PROMPT } from "./weekly-prompt";

export type WeeklySummary = { weekEnd: string; messages: UIMessage[] };

const hasText = (message: UIMessage) =>
  message.parts.some((part) => part.type === "text" && part.text.trim().length > 0);

// ES: El resumen informa; no debe quedar esperando una aprobación de la persona.
// EN: The summary informs; it must not be left waiting for the person's approval.
const asksApproval = (message: UIMessage) =>
  message.parts.some(
    (part) => part.type.startsWith("tool-request_") && part.type.endsWith("_approval"),
  );

export async function generateWeeklySummary(
  dependencies: Omit<TurnDependencies, "onContext">,
): Promise<WeeklySummary> {
  const question: UIMessage = {
    id: `weekly_${Date.now()}`,
    role: "user",
    parts: [{ type: "text", text: WEEKLY_SUMMARY_PROMPT }],
  };
  let weekEnd: string | undefined;
  const response = await streamAgentTurn([question], {
    ...dependencies,
    onContext: (context) => {
      weekEnd = context.calendar.presets.last_week?.to ?? context.calendar.dataAsOf;
    },
  });
  const { message, errors } = await collectAgentMessage(response);
  if (errors.length > 0) throw new Error(`El resumen terminó con errores: ${errors.join("; ")}`);
  if (message && asksApproval(message)) {
    throw new Error("El resumen pidió una aprobación; no se guarda.");
  }
  if (!message || !hasText(message) || !weekEnd) {
    throw new Error("El resumen no produjo una respuesta con texto.");
  }
  return { weekEnd, messages: [question, message] };
}
