/**
 * ES: Valida el cuerpo de /api/chat. El historial lo envía el cliente, así que además de la
 *     forma general de los mensajes se validan los resultados de las herramientas de
 *     aprobación contra su esquema (ApprovalOutput) antes de dárselos al modelo.
 * EN: Validates the /api/chat body. The history is sent by the client, so besides the
 *     general message shape the approval tool results are validated against their schema
 *     (ApprovalOutput) before they reach the model.
 */
import { safeValidateUIMessages, type UIMessage } from "ai";
import { createApprovalTools } from "./approval-tools";

export type ChatRequest = { ok: true; messages: UIMessage[] } | { ok: false };

export async function parseChatRequest(body: unknown): Promise<ChatRequest> {
  const messages = (body as { messages?: unknown } | null)?.messages;
  const validated = await safeValidateUIMessages({ messages, tools: createApprovalTools() });
  return validated.success ? { ok: true, messages: validated.data } : { ok: false };
}
