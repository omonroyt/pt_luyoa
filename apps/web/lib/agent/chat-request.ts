/**
 * ES: Valida el cuerpo de /api/chat. El historial lo envía el cliente, así que además de la
 *     forma general de los mensajes se validan los resultados de las herramientas de
 *     aprobación contra su esquema (ApprovalOutput) antes de dárselos al modelo. El id de la
 *     conversación (el que envía useChat) se acepta solo con un formato seguro; si falta,
 *     se genera uno.
 * EN: Validates the /api/chat body. The history is sent by the client, so besides the
 *     general message shape the approval tool results are validated against their schema
 *     (ApprovalOutput) before they reach the model. The conversation id (the one useChat
 *     sends) is only accepted in a safe format; if missing, one is generated.
 */
import { generateId, safeValidateUIMessages, type UIMessage } from "ai";
import { createApprovalTools } from "./approval-tools";

export type ChatRequest =
  { ok: true; conversationId: string; messages: UIMessage[] } | { ok: false };

export const CONVERSATION_ID = /^[A-Za-z0-9_-]{1,100}$/;

export async function parseChatRequest(body: unknown): Promise<ChatRequest> {
  const { id, messages } = (body ?? {}) as { id?: unknown; messages?: unknown };
  if (id !== undefined && !(typeof id === "string" && CONVERSATION_ID.test(id))) {
    return { ok: false };
  }
  const validated = await safeValidateUIMessages({ messages, tools: createApprovalTools() });
  if (!validated.success) return { ok: false };
  return { ok: true, conversationId: id ?? generateId(), messages: validated.data };
}
