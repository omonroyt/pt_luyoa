/**
 * ES: Aviso de una consulta del agente: "Comparando periodos…" mientras corre y una marca
 *     al terminar (07 §3.6, paso en curso).
 * EN: Notice for an agent query: "Comparando periodos…" while running and a mark when done
 *     (07 §3.6, step in progress).
 */
import type { StepStatus } from "@/lib/ui/tool-parts";

const ICON: Record<StepStatus, string> = { running: "…", done: "✓", error: "!" };
const ICON_CLASS: Record<StepStatus, string> = {
  running: "",
  done: "text-positive",
  error: "text-negative",
};

export function ToolStep({ label, status }: { label: string; status: StepStatus }) {
  return (
    <p
      className="flex items-center gap-2 text-sm text-muted"
      aria-live={status === "running" ? "polite" : undefined}
    >
      <span aria-hidden="true" className={ICON_CLASS[status]}>
        {ICON[status]}
      </span>
      <span>{status === "running" ? `${label}…` : label}</span>
    </p>
  );
}
