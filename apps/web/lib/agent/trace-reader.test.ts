import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type Database } from "../db/client";
import { readConversationCost, readMessageTrace, TraceQuery } from "./trace-reader";
import { saveTurn, type TurnRecord } from "./trace-store";

let db: Database;

beforeEach(async () => {
  db = await openDatabase({ url: ":memory:" });
});

const turn = (businessId: string, conversationId: string, assistantId: string): TurnRecord => ({
  conversationId,
  businessId,
  messages: [
    { id: `u-${assistantId}`, role: "user", parts: [{ type: "text", text: "Hola" }] },
    { id: assistantId, role: "assistant", parts: [{ type: "text", text: "Hola" }] },
  ] as UIMessage[],
  steps: [
    { kind: "llm", name: "modelo", tokensIn: 10, tokensOut: 2, costUsd: 0.001, latencyMs: 800 },
    { kind: "tool", name: "compare_periods", reason: "comparar meses", latencyMs: 300 },
    { kind: "presentation", name: "show_kpis", errorCode: "figure_verification" },
  ],
  totals: {
    model: "modelo",
    llmCalls: 1,
    toolCalls: 2,
    tokensIn: 10,
    tokensOut: 2,
    costUsd: 0.001,
    latencyMs: 1100,
  },
});

describe("readMessageTrace", () => {
  it("devuelve los pasos del mensaje en el orden en que ocurrieron", async () => {
    await saveTurn(db, turn("biz_alborada", "chat_1", "msg_1"));
    const steps = await readMessageTrace(db, "biz_alborada", {
      conversation: "chat_1",
      message: "msg_1",
    });
    expect(steps.map((step) => step.name)).toEqual(["modelo", "compare_periods", "show_kpis"]);
    expect(steps[1]).toMatchObject({ reason: "comparar meses", latencyMs: 300 });
    expect(steps[2]?.errorCode).toBe("figure_verification");
  });

  it("no devuelve pasos de otro negocio ni de otra conversación", async () => {
    await saveTurn(db, turn("biz_otro", "chat_2", "msg_2"));
    await saveTurn(db, turn("biz_alborada", "chat_1", "msg_1"));
    const read = (conversation: string, message: string) =>
      readMessageTrace(db, "biz_alborada", { conversation, message });
    expect(await read("chat_2", "msg_2")).toEqual([]);
    expect(await read("chat_1", "msg_2")).toEqual([]);
  });

  it("lee el costo acumulado de la conversación solo para este negocio (CA-Q06)", async () => {
    await saveTurn(db, turn("biz_alborada", "chat_1", "msg_1"));
    await saveTurn(db, turn("biz_alborada", "chat_1", "msg_3"));
    expect(await readConversationCost(db, "biz_alborada", "chat_1")).toBeCloseTo(0.002);
    expect(await readConversationCost(db, "biz_otro", "chat_1")).toBeNull();
  });

  it("acepta solo ids con formato seguro", () => {
    expect(TraceQuery.safeParse({ conversation: "chat_1", message: "msg_1" }).success).toBe(true);
    expect(TraceQuery.safeParse({ conversation: "x' OR 1=1", message: "m" }).success).toBe(false);
  });
});
