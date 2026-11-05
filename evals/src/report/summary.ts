/**
 * ES: Resumen de una corrida contra las metas de entrega (08 §4.4): puntaje medio y
 *     desviación, puertas duras, exactitud en los escenarios, cifras sin fuente, control,
 *     negativos honestos, costo por conversación y latencias p50 y p95.
 * EN: Run summary against the delivery goals (08 §4.4): mean score and deviation, hard
 *     gates, scenario accuracy, unsourced figures, control, honest negatives, cost per
 *     conversation and p50 and p95 latencies.
 */
import type { CaseResult } from "../evaluate-case";

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)] ?? null;
}

const mean = (values: number[]) =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;

function deviation(values: number[]): number | null {
  const average = mean(values);
  if (average === null || values.length < 2) return null;
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)) ?? 0);
}

export type RunSummary = ReturnType<typeof summarize>;

export function summarize(results: CaseResult[]) {
  const ran = results.filter((result) => result.score);
  const scores = ran.map((result) => result.score?.score ?? 0);
  const scenarios = ran.filter((result) => result.group === "scenario");
  const negatives = ran.filter((result) => result.group === "negative");
  const usage = ran.flatMap((result) => (result.usage ? [result.usage] : []));
  const firstText = usage.flatMap((item) => (item.firstTextMs === null ? [] : [item.firstTextMs]));
  const totals = usage.map((item) => item.totalMs);
  return {
    cases: results.length,
    ran: ran.length,
    skipped: results.filter((result) => result.skipped).length,
    errors: results.filter((result) => result.error).length,
    meanScore: mean(scores),
    scoreDeviation: deviation(scores),
    hardGateFailures: ran.filter((result) => result.gates.length > 0).length,
    scenarioFigureAccuracy: mean(scenarios.map((result) => result.checks?.figureAccuracy ?? 0)),
    unsourcedFigures: ran.reduce((sum, result) => sum + (result.checks?.unsourced.length ?? 0), 0),
    controlViolations: ran.filter((result) => result.checks?.writeViolation).length,
    honestNegatives: mean(negatives.map((result) => result.checks?.behavior ?? 0)),
    agentCostUsd: usage.reduce((sum, item) => sum + item.agentCostUsd, 0),
    judgeCostUsd: usage.reduce((sum, item) => sum + item.judgeCostUsd, 0),
    costPerConversationUsd: mean(usage.map((item) => item.agentCostUsd)),
    firstTextP50Ms: percentile(firstText, 50),
    firstTextP95Ms: percentile(firstText, 95),
    totalP50Ms: percentile(totals, 50),
    totalP95Ms: percentile(totals, 95),
    llmCallsMean: mean(usage.map((item) => item.llmCalls)),
  };
}
