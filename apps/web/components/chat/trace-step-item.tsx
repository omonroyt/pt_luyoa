/**
 * ES: Un paso de la traza: tipo, nombre, razón que dio el agente, duración, tokens y costo
 *     del modelo, y el error si lo hubo. La entrada se puede abrir para revisarla.
 * EN: A trace step: kind, name, reason the agent gave, duration, model tokens and cost,
 *     and the error if any. The input can be opened for review.
 */
import {
  errorLabel,
  formatMs,
  formatTokens,
  formatUsd,
  KIND_LABELS,
  type TraceStep,
} from "@/lib/ui/trace";

function stepFigures(step: TraceStep): string {
  const figures = [step.latencyMs === null ? null : formatMs(step.latencyMs)];
  if (step.kind === "llm") {
    figures.push(
      `${formatTokens(step.tokensIn ?? 0)} / ${formatTokens(step.tokensOut ?? 0)} tokens`,
      formatUsd(step.costUsd ?? 0),
    );
  }
  return figures.filter(Boolean).join(" · ");
}

export function TraceStepItem({ step, index }: { step: TraceStep; index: number }) {
  return (
    <li className="flex flex-col gap-0.5 border-b border-border py-2 text-sm last:border-b-0">
      <p>
        <span className="text-muted">
          {index + 1} · {KIND_LABELS[step.kind]}
        </span>{" "}
        <span className="break-all font-mono text-xs">{step.name}</span>
      </p>
      {step.reason ? <p className="text-muted">“{step.reason}”</p> : null}
      <p className="text-xs text-muted">{stepFigures(step)}</p>
      {step.errorCode ? (
        <p className="text-xs text-negative">{errorLabel(step.errorCode)}</p>
      ) : null}
      {step.input ? (
        <details className="text-xs">
          <summary className="cursor-pointer text-accent">Entrada</summary>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-background p-2">
            {JSON.stringify(step.input, null, 2)}
          </pre>
        </details>
      ) : null}
    </li>
  );
}
