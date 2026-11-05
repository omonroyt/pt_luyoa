import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it } from "vitest";
import { saveTurn } from "../agent/trace-store";
import { openDatabase, type Database } from "../db/client";
import { checkAccessAttempt, checkTurnAllowed, demoLimits, type DemoLimits } from "./demo-limits";

let db: Database;

beforeEach(async () => {
  db = await openDatabase({ url: ":memory:" });
});

const NOW = new Date("2026-11-05T18:00:00.000Z");
const LIMITS: DemoLimits = {
  turnsPerSession: 2,
  turnsPerIp: 3,
  dailyBudgetUsd: 0.05,
  accessAttemptsPerIp: 2,
};

const userMessage: UIMessage = { id: "u1", role: "user", parts: [{ type: "text", text: "Hola" }] };

async function recordSpend(costUsd: number, id: string) {
  const assistant: UIMessage = { id, role: "assistant", parts: [{ type: "text", text: "Ok" }] };
  await saveTurn(db, {
    conversationId: `chat_${id}`,
    businessId: "biz_alborada",
    messages: [userMessage, assistant],
    steps: [{ kind: "llm", name: "modelo", tokensIn: 10, tokensOut: 5, costUsd, latencyMs: 10 }],
    totals: {
      model: "modelo",
      llmCalls: 1,
      toolCalls: 0,
      tokensIn: 10,
      tokensOut: 5,
      costUsd,
      latencyMs: 10,
    },
  });
}

const turn = (sessionId: string, ipHash = "ip-a", now = NOW) =>
  checkTurnAllowed(db, { sessionId, ipHash, limits: LIMITS, now });

describe("topes de la demo publicada (IMP-63, CA-S04)", () => {
  it("corta la sesión al pasar sus turnos del día y la deja seguir al día siguiente", async () => {
    expect(await turn("s1")).toEqual({ ok: true });
    expect(await turn("s1")).toEqual({ ok: true });
    expect(await turn("s1")).toMatchObject({ ok: false, code: "rate_limited" });
    const tomorrow = new Date("2026-11-06T01:00:00.000Z");
    expect(await turn("s1", "ip-b", tomorrow)).toEqual({ ok: true });
  });

  it("una IP no rebasa su tope aunque abra sesiones nuevas", async () => {
    await turn("s1");
    await turn("s2");
    await turn("s3");
    expect(await turn("s4")).toMatchObject({ ok: false, code: "rate_limited" });
    expect(await turn("s5", "ip-otra")).toEqual({ ok: true });
  });

  it("no deja pasar turnos cuando el gasto de hoy llegó al tope, sin consumir turnos", async () => {
    await recordSpend(0.03, "a1");
    expect(await turn("s1")).toEqual({ ok: true });
    await recordSpend(0.03, "a2");
    expect(await turn("s1")).toMatchObject({ ok: false, code: "budget_exhausted" });
    expect(await turn("s1")).toMatchObject({ ok: false, code: "budget_exhausted" });
  });

  it("limita los intentos de código de acceso por IP", async () => {
    const attempt = () => checkAccessAttempt(db, { ipHash: "ip-a", limits: LIMITS, now: NOW });
    expect(await attempt()).toBe(true);
    expect(await attempt()).toBe(true);
    expect(await attempt()).toBe(false);
  });

  it("toma los topes del entorno y usa valores por defecto", () => {
    expect(demoLimits({})).toEqual({
      turnsPerSession: 30,
      turnsPerIp: 100,
      dailyBudgetUsd: 1,
      accessAttemptsPerIp: 20,
    });
    expect(demoLimits({ DEMO_DAILY_BUDGET_USD: "0.5" }).dailyBudgetUsd).toBe(0.5);
    expect(() => demoLimits({ DEMO_TURNS_PER_IP: "muchos" })).toThrow(/números positivos/);
  });
});
