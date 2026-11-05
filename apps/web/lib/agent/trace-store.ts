/**
 * ES: Guarda un turno en la base de datos (IMP-35, ADR-11): la conversación, sus mensajes,
 *     los pasos de la traza del mensaje del asistente y el costo acumulado de la
 *     conversación (CA-Q06). Los tokens de aprobación se enmascaran antes de guardar: al
 *     terminar el turno ya se usaron, pero no hay razón para conservarlos.
 * EN: Stores a turn in the database (IMP-35, ADR-11): the conversation, its messages, the
 *     trace steps of the assistant message and the accumulated conversation cost (CA-Q06).
 *     Approval tokens are masked before storing: by the end of the turn they were already
 *     used, but there is no reason to keep them.
 */
import { randomUUID } from "node:crypto";
import type { UIMessage } from "ai";
import { eq, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { conversations, messages, traceSteps } from "../db/schema";
import type { TraceStep, TurnTotals } from "./turn-tracer";

export type TurnRecord = {
  conversationId: string;
  businessId: string;
  messages: UIMessage[];
  steps: TraceStep[];
  totals: TurnTotals;
};

const MASK = "[enmascarado]";
const TITLE_LENGTH = 80;

export function maskApprovalTokens(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskApprovalTokens);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      key === "approval_token" ? MASK : maskApprovalTokens(item),
    ]),
  );
}

function titleOf(history: UIMessage[]): string | null {
  const first = history.find((message) => message.role === "user");
  const text = first?.parts.find((part) => part.type === "text");
  return text && "text" in text ? text.text.slice(0, TITLE_LENGTH) : null;
}

export async function saveTurn(db: Database, record: TurnRecord): Promise<void> {
  const { conversationId } = record;
  const assistant = record.messages.at(-1);
  await db.transaction(async (tx) => {
    await tx
      .insert(conversations)
      .values({
        id: conversationId,
        businessId: record.businessId,
        title: titleOf(record.messages),
      })
      .onConflictDoNothing();
    // ES: Aislamiento por negocio (ADR-16): un id de conversación ajeno no se reutiliza.
    // EN: Per-business isolation (ADR-16): another business's conversation id is not reused.
    const [owner] = await tx
      .select({ businessId: conversations.businessId })
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    if (owner?.businessId !== record.businessId) {
      throw new Error("La conversación pertenece a otro negocio.");
    }
    for (const message of record.messages) {
      const parts = maskApprovalTokens(message.parts);
      await tx
        .insert(messages)
        .values({ id: message.id, conversationId, role: message.role, parts })
        .onConflictDoUpdate({
          target: messages.id,
          set: { parts },
          // ES: Nunca sobrescribe un mensaje de otra conversación con el mismo id.
          // EN: Never overwrites a message from another conversation with the same id.
          setWhere: eq(messages.conversationId, conversationId),
        });
    }
    if (assistant?.role === "assistant" && record.steps.length > 0) {
      await tx.insert(traceSteps).values(
        record.steps.map((step) => ({
          id: randomUUID(),
          messageId: assistant.id,
          ...step,
          input: maskApprovalTokens(step.input),
        })),
      );
    }
    await tx
      .update(conversations)
      .set({ costUsd: sql`${conversations.costUsd} + ${record.totals.costUsd}` })
      .where(eq(conversations.id, conversationId));
  });
}
