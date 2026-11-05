/**
 * ES: Trazador de un turno (ADR-11, IMP-35, CA-Q05). Registra cada llamada al modelo
 *     (tokens, costo de OpenRouter y latencia) y cada herramienta (tipo, razón, entrada,
 *     resumen del resultado, duración y código de error). Las herramientas de aprobación
 *     no se ejecutan en el servidor, así que se registran desde la llamada del modelo; los
 *     argumentos inválidos, desde el resultado del paso.
 * EN: Turn tracer (ADR-11, IMP-35, CA-Q05). It records every model call (tokens,
 *     OpenRouter cost and latency) and every tool (kind, reason, input, result summary,
 *     duration and error code). Approval tools are not executed on the server, so they are
 *     recorded from the model call; invalid arguments, from the step result.
 */
import type { ProviderMetadata } from "ai";
import { APPROVAL_TOOLS } from "./approval-tools";
import { FigureVerificationError } from "./figure-verifier";
import { PRESENTATION_TOOLS } from "./presentation-tools";
import { payloadFromMcpResult } from "./source-registry";
import { splitReason } from "./with-reason";

export type TraceKind = "llm" | "tool" | "presentation" | "approval";

export type TraceStep = {
  kind: TraceKind;
  name: string;
  input?: unknown;
  outputSummary?: unknown;
  reason?: string;
  latencyMs?: number;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  errorCode?: string;
};

export type TurnTotals = {
  model: string;
  llmCalls: number;
  toolCalls: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
};

const presentation = new Set<string>(PRESENTATION_TOOLS);
const approval = new Set<string>(APPROVAL_TOOLS);

export function kindOf(toolName: string): TraceKind {
  if (presentation.has(toolName)) return "presentation";
  if (approval.has(toolName)) return "approval";
  return "tool";
}

export function costFrom(metadata: ProviderMetadata | undefined): number {
  const usage = (metadata?.openrouter as { usage?: { cost?: number } } | undefined)?.usage;
  return usage?.cost ?? 0;
}

function mcpErrorCode(result: unknown): string | undefined {
  const content = (result as { content?: Array<{ text?: string }> } | null)?.content;
  try {
    const parsed = JSON.parse(content?.[0]?.text ?? "{}") as { error?: { code?: string } };
    return parsed.error?.code;
  } catch {
    return undefined;
  }
}

/**
 * ES: Resumen compacto del resultado: la fuente y los avisos de una consulta, nunca los
 *     datos completos.
 * EN: Compact result summary: the source and warnings of a query, never the full data.
 */
export function summarizeResult(result: unknown): Pick<TraceStep, "outputSummary" | "errorCode"> {
  const errorCode = mcpErrorCode(result);
  if (errorCode) return { errorCode, outputSummary: { error: errorCode } };
  const payload = payloadFromMcpResult(result) as
    { source: { id: string }; warnings?: string[] } | undefined;
  if (payload)
    return {
      outputSummary: { source: payload.source.id, warnings: payload.warnings?.length ?? 0 },
    };
  return { outputSummary: result };
}

function summarizeError(error: unknown): Pick<TraceStep, "outputSummary" | "errorCode"> {
  if (error instanceof FigureVerificationError) {
    return { errorCode: "figure_verification", outputSummary: { problems: error.problems } };
  }
  return { errorCode: "execution_error", outputSummary: { message: String(error).slice(0, 300) } };
}

function toolStep(toolName: string, input: unknown): TraceStep {
  const { reason, rest } = splitReason(input);
  return { kind: kindOf(toolName), name: toolName, input: rest, ...(reason ? { reason } : {}) };
}

type ToolCallPart = {
  type: string;
  toolName?: string;
  input?: unknown;
  invalid?: boolean;
};
type LanguageModelCallEnd = {
  modelId?: string;
  usage: { inputTokens?: number; outputTokens?: number };
  providerMetadata?: ProviderMetadata;
  performance: { responseTimeMs: number };
  content: ReadonlyArray<ToolCallPart>;
};
type ToolExecutionEnd = {
  toolCall: { toolName: string; input: unknown };
  toolExecutionMs: number;
  toolOutput: { type: "tool-result"; output: unknown } | { type: "tool-error"; error: unknown };
};

export function createTurnTracer(modelId: string, now: () => number = Date.now) {
  const steps: TraceStep[] = [];
  const startedAt = now();
  const onLanguageModelCallEnd = (event: LanguageModelCallEnd) => {
    steps.push({
      kind: "llm",
      name: event.modelId ?? modelId,
      tokensIn: event.usage.inputTokens ?? 0,
      tokensOut: event.usage.outputTokens ?? 0,
      costUsd: costFrom(event.providerMetadata),
      latencyMs: Math.round(event.performance.responseTimeMs),
    });
    for (const part of event.content) {
      if (part.type === "tool-call" && part.toolName && approval.has(part.toolName)) {
        steps.push({
          ...toolStep(part.toolName, part.input),
          outputSummary: { awaiting: "person" },
        });
      }
    }
  };
  const onToolExecutionEnd = (event: ToolExecutionEnd) => {
    const output = event.toolOutput;
    const summary =
      output.type === "tool-result" ? summarizeResult(output.output) : summarizeError(output.error);
    steps.push({
      ...toolStep(event.toolCall.toolName, event.toolCall.input),
      ...summary,
      latencyMs: Math.round(event.toolExecutionMs),
    });
  };
  // ES: El AI SDK marca la llamada con argumentos inválidos como tool-call con invalid: true.
  // EN: The AI SDK marks a call with invalid arguments as a tool-call with invalid: true.
  const onStepEnd = (event: { content: ReadonlyArray<ToolCallPart> }) => {
    for (const part of event.content) {
      if (part.type === "tool-call" && part.invalid === true && part.toolName) {
        steps.push({ ...toolStep(part.toolName, part.input), errorCode: "invalid_input" });
      }
    }
  };
  const totals = (): TurnTotals => {
    const llm = steps.filter((step) => step.kind === "llm");
    const sum = (pick: (step: TraceStep) => number | undefined) =>
      llm.reduce((total, step) => total + (pick(step) ?? 0), 0);
    return {
      model: modelId,
      llmCalls: llm.length,
      toolCalls: steps.length - llm.length,
      tokensIn: sum((step) => step.tokensIn),
      tokensOut: sum((step) => step.tokensOut),
      costUsd: sum((step) => step.costUsd),
      latencyMs: now() - startedAt,
    };
  };
  return { steps, totals, callbacks: { onLanguageModelCallEnd, onToolExecutionEnd, onStepEnd } };
}
