/**
 * ES: Lectura de la traza de un mensaje para el panel de trazas (IMP-43, CA-Q05). Solo
 *     devuelve pasos si el mensaje pertenece a esa conversación y la conversación a este
 *     negocio (ADR-16); los tokens de aprobación se enmascaran otra vez al leer.
 * EN: Reads a message's trace for the trace panel (IMP-43, CA-Q05). It only returns steps
 *     if the message belongs to that conversation and the conversation to this business
 *     (ADR-16); approval tokens are masked again on read.
 */
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db/client";
import { conversations, messages, traceSteps } from "../db/schema";
import { CONVERSATION_ID } from "./chat-request";
import { maskApprovalTokens } from "./trace-store";
import type { TraceKind } from "./turn-tracer";

export const TraceQuery = z.object({
  conversation: z.string().regex(CONVERSATION_ID),
  message: z.string().regex(CONVERSATION_ID),
});
export type TraceQuery = z.infer<typeof TraceQuery>;

export type TraceStepView = {
  kind: TraceKind;
  name: string;
  reason: string | null;
  input: unknown;
  outputSummary: unknown;
  latencyMs: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
  costUsd: number | null;
  errorCode: string | null;
};

export async function readConversationCost(
  db: Database,
  businessId: string,
  conversationId: string,
): Promise<number | null> {
  const [row] = await db
    .select({ costUsd: conversations.costUsd })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.businessId, businessId)));
  return row?.costUsd ?? null;
}

export async function readMessageTrace(
  db: Database,
  businessId: string,
  query: TraceQuery,
): Promise<TraceStepView[]> {
  const rows = await db
    .select({ step: traceSteps })
    .from(traceSteps)
    .innerJoin(messages, eq(messages.id, traceSteps.messageId))
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        eq(traceSteps.messageId, query.message),
        eq(messages.conversationId, query.conversation),
        eq(conversations.businessId, businessId),
      ),
    )
    // ES: Los pasos de un turno se insertan juntos y en orden; rowid conserva ese orden.
    // EN: A turn's steps are inserted together and in order; rowid keeps that order.
    .orderBy(sql`trace_steps.rowid`);
  return rows.map(({ step }) => ({
    kind: step.kind as TraceKind,
    name: step.name,
    reason: step.reason,
    input: maskApprovalTokens(step.input),
    outputSummary: step.outputSummary,
    latencyMs: step.latencyMs,
    tokensIn: step.tokensIn,
    tokensOut: step.tokensOut,
    costUsd: step.costUsd,
    errorCode: step.errorCode,
  }));
}
