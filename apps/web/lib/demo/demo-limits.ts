/**
 * ES: Topes de la demo publicada (IMP-63, CA-S04, 03 §7). Solo aplican cuando la protección
 *     está activa (hay un código de acceso). Antes de cada turno del chat:
 *     1. el gasto registrado hoy en las trazas no debe llegar al tope diario;
 *     2. la sesión y la IP no deben pasar sus turnos del día.
 *     El gasto se revisa primero para no consumir turnos cuando ya no hay presupuesto. El
 *     día se mide en UTC.
 * EN: Published demo caps (IMP-63, CA-S04, 03 §7). They only apply when protection is on
 *     (an access code exists). Before every chat turn:
 *     1. today's spend recorded in the traces must not reach the daily cap;
 *     2. the session and the IP must not exceed their turns for the day.
 *     Spend is checked first so turns are not consumed when there is no budget left. The
 *     day is measured in UTC.
 */
import { z } from "zod";
import type { Database } from "../db/client";
import { incrementCounter, spentSince } from "./usage-store";

const positiveNumber = (fallback: number) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? fallback : Number(value)),
    z.number().positive(),
  );

const LimitsEnv = z.object({
  DEMO_TURNS_PER_SESSION: positiveNumber(30),
  DEMO_TURNS_PER_IP: positiveNumber(100),
  DEMO_DAILY_BUDGET_USD: positiveNumber(1),
  DEMO_ACCESS_ATTEMPTS_PER_IP: positiveNumber(20),
});

export type DemoLimits = {
  turnsPerSession: number;
  turnsPerIp: number;
  dailyBudgetUsd: number;
  accessAttemptsPerIp: number;
};

export function demoLimits(env: Record<string, string | undefined> = process.env): DemoLimits {
  const parsed = LimitsEnv.safeParse(env);
  if (!parsed.success) throw new Error("Los topes DEMO_* deben ser números positivos.");
  return {
    turnsPerSession: parsed.data.DEMO_TURNS_PER_SESSION,
    turnsPerIp: parsed.data.DEMO_TURNS_PER_IP,
    dailyBudgetUsd: parsed.data.DEMO_DAILY_BUDGET_USD,
    accessAttemptsPerIp: parsed.data.DEMO_ACCESS_ATTEMPTS_PER_IP,
  };
}

export const utcDay = (now: Date) => now.toISOString().slice(0, 10);
const startOfUtcDay = (now: Date) => new Date(`${utcDay(now)}T00:00:00.000Z`);

export type LimitVerdict = { ok: true } | { ok: false; code: string; message: string };

type TurnRequest = { sessionId: string; ipHash: string; limits: DemoLimits; now?: Date };

export async function checkTurnAllowed(db: Database, request: TurnRequest): Promise<LimitVerdict> {
  const now = request.now ?? new Date();
  const { limits } = request;
  if ((await spentSince(db, startOfUtcDay(now))) >= limits.dailyBudgetUsd) {
    return {
      ok: false,
      code: "budget_exhausted",
      message: "La demo llegó a su tope de gasto de hoy. Vuelve a intentarlo mañana.",
    };
  }
  const day = utcDay(now);
  const sessionTurns = await incrementCounter(db, `turn:session:${request.sessionId}:${day}`, now);
  const ipTurns = await incrementCounter(db, `turn:ip:${request.ipHash}:${day}`, now);
  if (sessionTurns > limits.turnsPerSession || ipTurns > limits.turnsPerIp) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Llegaste al límite de mensajes de hoy en esta demo. Vuelve a intentarlo mañana.",
    };
  }
  return { ok: true };
}

export async function checkAccessAttempt(
  db: Database,
  request: { ipHash: string; limits: DemoLimits; now?: Date },
): Promise<boolean> {
  const now = request.now ?? new Date();
  const attempts = await incrementCounter(db, `access:ip:${request.ipHash}:${utcDay(now)}`, now);
  return attempts <= request.limits.accessAttemptsPerIp;
}
