/**
 * ES: Aviso de una consulta del agente: "Comparando periodos…" con un indicador que gira
 *     mientras corre y una marca al terminar (07 §3.6, paso en curso).
 * EN: Notice for an agent query: "Comparando periodos…" with a spinner while it runs and a
 *     mark when done (07 §3.6, step in progress).
 */
import { Icon } from "@/components/ui/icon";
import type { StepStatus } from "@/lib/ui/tool-parts";

const TONE: Record<StepStatus, string> = {
  running: "border-accent/30 text-foreground",
  done: "border-border text-muted",
  error: "border-negative/40 bg-negative-soft text-negative",
};

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "running") {
    return (
      <span
        aria-hidden="true"
        className="size-3.5 animate-spin rounded-full border-2 border-accent/25 border-t-accent"
      />
    );
  }
  return (
    <Icon
      name={status === "done" ? "check" : "alert"}
      className={`size-3.5 ${status === "done" ? "text-positive" : ""}`}
    />
  );
}

export function ToolStep({ label, status }: { label: string; status: StepStatus }) {
  return (
    <p
      className={`inline-flex max-w-full animate-fade items-center gap-2 self-start rounded-full border bg-card/70 px-3 py-1 text-xs ${TONE[status]}`}
      aria-live={status === "running" ? "polite" : undefined}
    >
      <StepIcon status={status} />
      <span className="truncate">{status === "running" ? `${label}…` : label}</span>
    </p>
  );
}
