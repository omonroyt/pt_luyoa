import type { UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type Database } from "../db/client";
import { conversations, messages, traceSteps } from "../db/schema";
import { maskApprovalTokens, saveTurn, type TurnRecord } from "./trace-store";

let db: Database;

beforeEach(async () => {
  db = await openDatabase({ url: ":memory:" });
});

const history = (assistantId: string, token = "abc.firma"): UIMessage[] => [
  { id: "u1", role: "user", parts: [{ type: "text", text: "Prepara la campaña" }] },
  {
    id: assistantId,
    role: "assistant",
    parts: [
      {
        type: "tool-request_draft_approval",
        toolCallId: "c1",
        state: "output-available",
        input: {},
        output: { approved: true, approval_token: token, approval_id: "a1", expires_at: "x" },
      },
    ],
  },
];

const turn = (assistantId: string, cost: number, businessId = "biz_alborada"): TurnRecord => ({
  conversationId: "chat_1",
  businessId,
  messages: history(assistantId),
  steps: [
    {
      kind: "llm",
      name: "z-ai/glm-5.3-flash",
      tokensIn: 100,
      tokensOut: 20,
      costUsd: cost,
      latencyMs: 900,
    },
    {
      kind: "tool",
      name: "compare_periods",
      reason: "comparar meses",
      latencyMs: 300,
      outputSummary: { source: "src_aaaaaaaaaa" },
    },
  ],
  totals: {
    model: "z-ai/glm-5.3-flash",
    llmCalls: 1,
    toolCalls: 1,
    tokensIn: 100,
    tokensOut: 20,
    costUsd: cost,
    latencyMs: 1200,
  },
});

describe("saveTurn", () => {
  it("guarda la conversación, los mensajes y los pasos ligados al mensaje del asistente", async () => {
    await saveTurn(db, turn("msg_1", 0.002));
    const [conversation] = await db.select().from(conversations);
    expect(conversation).toMatchObject({ id: "chat_1", title: "Prepara la campaña" });
    expect(await db.select().from(messages)).toHaveLength(2);
    const steps = await db.select().from(traceSteps).where(eq(traceSteps.messageId, "msg_1"));
    expect(steps.map((step) => step.kind)).toEqual(["llm", "tool"]);
    expect(steps[1]).toMatchObject({ reason: "comparar meses", latencyMs: 300 });
  });

  it("acumula el costo de la conversación turno a turno (CA-Q06)", async () => {
    await saveTurn(db, turn("msg_1", 0.002));
    await saveTurn(db, turn("msg_2", 0.003));
    const [conversation] = await db.select().from(conversations);
    expect(conversation?.costUsd).toBeCloseTo(0.005);
  });

  it("no guarda el token de aprobación en el historial", async () => {
    await saveTurn(db, turn("msg_1", 0.001));
    const stored = JSON.stringify(await db.select().from(messages));
    expect(stored).not.toContain("abc.firma");
    expect(stored).toContain("[enmascarado]");
  });

  it("no escribe en una conversación de otro negocio", async () => {
    await saveTurn(db, turn("msg_1", 0.001));
    await expect(saveTurn(db, turn("msg_9", 0.001, "biz_otro"))).rejects.toThrow("otro negocio");
    expect(
      await db.select().from(traceSteps).where(eq(traceSteps.messageId, "msg_9")),
    ).toHaveLength(0);
  });
});

describe("maskApprovalTokens", () => {
  it("enmascara el token en cualquier nivel sin tocar lo demás", () => {
    expect(maskApprovalTokens({ a: [{ approval_token: "t", b: 1 }] })).toEqual({
      a: [{ approval_token: "[enmascarado]", b: 1 }],
    });
  });
});
