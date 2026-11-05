/**
 * ES: Evalúa un caso de punta a punta: lo corre contra el agente, aplica las
 *     verificaciones deterministas y el juez, y calcula el puntaje y las puertas duras.
 *     Un caso que requiere funciones de M7 se marca como omitido y no cuenta como aprobado.
 * EN: Evaluates a case end to end: runs it against the agent, applies the deterministic
 *     checks and the judge, and computes the score and hard gates. A case that requires
 *     M7 features is marked as skipped and does not count as passed.
 */
import type { LanguageModel } from "ai";
import { missingRequirements, type EvalCase } from "./cases/case-schema";
import { loadGolden } from "./cases/load-cases";
import { BUDGET_EXHAUSTED, type Budget } from "./budget";
import { retryRateLimited } from "./runner/retry";
import { runCase, type CaseTranscript, type RunDependencies } from "./runner/run-case";
import { runChecks, type Checks } from "./scoring/checks";
import { extract, withContext } from "./scoring/extract";
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

// ES: Extracto de la conversación para auditar el puntaje y al juez desde el reporte.
// EN: Conversation excerpt to audit the score and the judge from the report.
export type CaseExcerpt = {
  text: string;
  steps: string[];
  blocks: string[];
  replies: unknown[];
  toolResults: string[];
};

const EXCERPT_LIMIT = 6000;
const RESULT_LIMIT = 2000;

function excerptOf(extracted: ReturnType<typeof extract>, replies: unknown[]): CaseExcerpt {
  return {
    text: extracted.text.slice(0, EXCERPT_LIMIT),
    steps: extracted.steps
      .filter((step) => step.kind !== "llm")
      .map((step) => (step.errorCode ? `${step.name} (${step.errorCode})` : step.name)),
    blocks: extracted.blocks.map((block) => block.kind),
    replies,
    toolResults: extracted.mcpOutputs.map((output) =>
      JSON.stringify(output).slice(0, RESULT_LIMIT),
    ),
  };
}

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
  excerpt?: CaseExcerpt;
};

export type EvaluationDependencies = RunDependencies & {
  judge?: LanguageModel;
  criteria: Map<string, string>;
  // ES: Contexto que el agente recibe en el prompt y no por una herramienta: definiciones
  //     de segmentos y reglas del negocio. Sus cifras cuentan como fuente.
  // EN: Context the agent receives in the prompt rather than through a tool: segment
  //     definitions and business rules. Its figures count as a source.
  context?: unknown[];
  // ES: Recibe cada transcripción completa, para guardarla y volver a calificarla.
  // EN: Receives each full transcript, to store it and re-score it later.
  onTranscript?: (caseId: string, repeat: number, transcript: CaseTranscript) => void;
  budget?: Budget;
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

/**
 * ES: Una respuesta vacía por un error del servicio no se califica: daría puntos gratis
 *     ("sin cifras inventadas", "sin escrituras") y gastaría en el juez. Se reporta como
 *     error con su causa.
 * EN: An empty answer caused by a service error is not scored: it would earn free points
 *     ("no invented figures", "no writes") and spend on the judge. It is reported as an
 *     error with its cause.
 */
export function serviceFailure(
  transcript: Awaited<ReturnType<typeof runCase>>,
  extracted: ReturnType<typeof extract>,
): string | undefined {
  const errors = transcript.requests.flatMap((request) => request.errors);
  const empty = extracted.text.trim() === "" && extracted.blocks.length === 0;
  return empty && errors.length > 0
    ? `Sin respuesta por error del servicio: ${errors[0]}`
    : undefined;
}

const baseOf = (evalCase: EvalCase, repeat: number) => ({
  caseId: evalCase.id,
  group: evalCase.group,
  title: evalCase.title,
  repeat,
  gates: [],
  writes: 0,
});

export async function evaluateCase(
  evalCase: EvalCase,
  repeat: number,
  deps: EvaluationDependencies,
): Promise<CaseResult> {
  const base = baseOf(evalCase, repeat);
  const missing = missingRequirements(evalCase);
  if (missing.length > 0) return { ...base, skipped: `Requiere ${missing.join(", ")} (M7)` };
  if (deps.budget && !deps.budget.canStart()) return { ...base, skipped: BUDGET_EXHAUSTED };
  const result = await runAndScore(evalCase, repeat, deps);
  deps.budget?.add((result.usage?.agentCostUsd ?? 0) + (result.usage?.judgeCostUsd ?? 0));
  return result;
}

async function runAndScore(
  evalCase: EvalCase,
  repeat: number,
  deps: EvaluationDependencies,
): Promise<CaseResult> {
  const base = baseOf(evalCase, repeat);
  try {
    const transcript = await retryRateLimited(() => runCase(evalCase, deps));
    deps.onTranscript?.(evalCase.id, repeat, transcript);
    const extracted = withContext(extract(transcript), deps.context ?? []);
    const failure = serviceFailure(transcript, extracted);
    if (failure) return { ...base, error: failure, usage: usageOf(transcript, 0) };
    const judge = deps.judge
      ? await judgeCase(deps.judge, evalCase, extracted, deps.criteria)
      : undefined;
    return { ...base, ...scoreTranscript(evalCase, transcript, extracted, judge) };
  } catch (error) {
    return { ...base, error: error instanceof Error ? error.message.slice(0, 300) : String(error) };
  }
}

/**
 * ES: Vuelve a calificar una transcripción guardada con el código actual de las
 *     verificaciones, conservando la calificación del juez original. Permite corregir el
 *     verificador sin volver a pagar las conversaciones.
 * EN: Re-scores a stored transcript with the current checks code, keeping the original
 *     judge rating. It allows fixing the verifier without paying for the conversations again.
 */
export function rescoreCase(
  evalCase: EvalCase,
  repeat: number,
  transcript: CaseTranscript,
  rescore: { context: unknown[]; judge: JudgeResult | undefined },
): CaseResult {
  const base = baseOf(evalCase, repeat);
  const extracted = withContext(extract(transcript), rescore.context);
  const failure = serviceFailure(transcript, extracted);
  if (failure) return { ...base, error: failure, usage: usageOf(transcript, 0) };
  return { ...base, ...scoreTranscript(evalCase, transcript, extracted, rescore.judge) };
}

function scoreTranscript(
  evalCase: EvalCase,
  transcript: CaseTranscript,
  extracted: ReturnType<typeof extract>,
  judge: JudgeResult | undefined,
) {
  const golden = evalCase.expect.golden ? loadGolden(evalCase.expect.golden) : undefined;
  const checks = runChecks(evalCase, transcript, extracted, golden);
  return {
    score: scoreCase(checks, judge?.score ?? null),
    gates: hardGateFailures(evalCase, checks),
    checks,
    judge,
    usage: usageOf(transcript, judge?.costUsd ?? 0),
    writes: transcript.writes.length,
    pendingApproval: transcript.pendingApproval,
    excerpt: excerptOf(extracted, transcript.replies),
  };
}
