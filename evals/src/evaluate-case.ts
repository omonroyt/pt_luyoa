/**
 * ES: Evalúa un caso de punta a punta: lo corre contra el agente, aplica las
 *     verificaciones deterministas y el juez, y calcula el puntaje y las puertas duras.
 *     Un caso que requiere funciones de M7 se marca como omitido y no cuenta como aprobado.
 * EN: Evaluates a case end to end: runs it against the agent, applies the deterministic
 *     checks and the judge, and computes the score and hard gates. A case that requires
 *     M7 features is marked as skipped and does not count as passed.
 */
import type { LanguageModel } from "ai";
import type { EvalCase } from "./cases/case-schema";
import { loadGolden } from "./cases/load-cases";
import { runCase, type RunDependencies } from "./runner/run-case";
import { runChecks, type Checks } from "./scoring/checks";
import { extract } from "./scoring/extract";
import { judgeCase, type JudgeResult } from "./scoring/judge";
import { hardGateFailures, scoreCase, type CaseScore } from "./scoring/score";

export type CaseUsage = {
  agentCostUsd: number;
  judgeCostUsd: number;
  tokensIn: number;
  tokensOut: number;
  llmCalls: number;
  requests: number;
  firstTextMs: number | null;
  totalMs: number;
  streamErrors: string[];
};

export type CaseResult = {
  caseId: string;
  group: EvalCase["group"];
  title: string;
  repeat: number;
  skipped?: string;
  error?: string;
  score?: CaseScore;
  gates: string[];
  checks?: Checks;
  judge?: JudgeResult;
  usage?: CaseUsage;
  writes: number;
  pendingApproval?: boolean;
};

export type EvaluationDependencies = RunDependencies & {
  judge?: LanguageModel;
  criteria: Map<string, string>;
};

function usageOf(transcript: Awaited<ReturnType<typeof runCase>>, judgeCost: number): CaseUsage {
  const totals = transcript.requests.map((request) => request.totals);
  const sum = (pick: (total: NonNullable<(typeof totals)[number]>) => number) =>
    totals.reduce((acc, total) => acc + (total ? pick(total) : 0), 0);
  return {
    agentCostUsd: sum((total) => total.costUsd),
    judgeCostUsd: judgeCost,
    tokensIn: sum((total) => total.tokensIn),
    tokensOut: sum((total) => total.tokensOut),
    llmCalls: sum((total) => total.llmCalls),
    requests: transcript.requests.length,
    firstTextMs:
      transcript.requests.find((request) => request.firstTextMs !== null)?.firstTextMs ?? null,
    totalMs: transcript.requests.reduce((acc, request) => acc + request.totalMs, 0),
    streamErrors: transcript.requests.flatMap((request) => request.errors),
  };
}

export async function evaluateCase(
  evalCase: EvalCase,
  repeat: number,
  deps: EvaluationDependencies,
): Promise<CaseResult> {
  const base = {
    caseId: evalCase.id,
    group: evalCase.group,
    title: evalCase.title,
    repeat,
    gates: [],
    writes: 0,
  };
  if (evalCase.requires.length > 0) {
    return { ...base, skipped: `Requiere ${evalCase.requires.join(", ")} (M7)` };
  }
  try {
    const transcript = await runCase(evalCase, deps);
    const extracted = extract(transcript);
    const golden = evalCase.expect.golden ? loadGolden(evalCase.expect.golden) : undefined;
    const checks = runChecks(evalCase, transcript, extracted, golden);
    const judge = deps.judge
      ? await judgeCase(deps.judge, evalCase, extracted, deps.criteria)
      : undefined;
    return {
      ...base,
      score: scoreCase(checks, judge?.score ?? null),
      gates: hardGateFailures(evalCase, checks),
      checks,
      judge,
      usage: usageOf(transcript, judge?.costUsd ?? 0),
      writes: transcript.writes.length,
      pendingApproval: transcript.pendingApproval,
    };
  } catch (error) {
    return { ...base, error: error instanceof Error ? error.message.slice(0, 300) : String(error) };
  }
}
