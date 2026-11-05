"use client";

/**
 * ES: Panel de aprobación (ADR-08, R-06, IMP-42): el único lugar donde la persona autoriza
 *     crear o enviar una campaña. Al pulsar un botón el panel se bloquea hasta terminar,
 *     así que no hay doble clic (07 §3.4). Si la solicitud del token falla, nada queda
 *     aprobado y la persona puede intentar de nuevo.
 * EN: Approval panel (ADR-08, R-06, IMP-42): the only place where the person authorizes
 *     creating or sending a campaign. Pressing a button locks the panel until it finishes,
 *     so there is no double click (07 §3.4). If the token request fails, nothing is
 *     approved and the person can try again.
 */
import { useState } from "react";
import {
  approvalOutcomeOf,
  changeRequestOutput,
  discardOutput,
  requestApproval,
  type ApprovalView,
} from "@/lib/ui/approvals";
import type { ToolView } from "@/lib/ui/tool-parts";
import { useApprovalBridge } from "./approval-context";
import { ApprovalSummary } from "./approval-summary";
import { ChangeRequestForm } from "./change-request-form";

const COPY = {
  create: { question: "¿Preparo este borrador?", approve: "Preparar borrador" },
  send: { question: "¿Envío esta campaña?", approve: "Enviar" },
};

const OUTCOME_TEXT = {
  approved: "Aprobado. El copiloto continúa con este contenido exacto.",
  changes: "Pediste cambios. El copiloto ajusta la propuesta y vuelve a pedir aprobación.",
  discarded: "Descartaste la campaña. No se guardó nada.",
};

type Phase = "idle" | "working" | "changing" | "failed";

const buttonClass = "h-11 rounded-xl border border-border px-4 disabled:opacity-50";

function useApprovalActions(tool: ToolView, view: ApprovalView) {
  const bridge = useApprovalBridge();
  const [phase, setPhase] = useState<Phase>("idle");
  const approve = async () => {
    setPhase("working");
    try {
      bridge.resolve(tool.name, tool.callId, await requestApproval(view));
    } catch {
      setPhase("failed");
    }
  };
  const reject = (output: ReturnType<typeof discardOutput>) => {
    setPhase("working");
    bridge.resolve(tool.name, tool.callId, output);
  };
  const locked = bridge.busy || phase === "working";
  return { phase, setPhase, approve, reject, locked };
}

function ActivePanel({ tool, view }: { tool: ToolView; view: ApprovalView }) {
  const { phase, setPhase, approve, reject, locked } = useApprovalActions(tool, view);
  const copy = COPY[view.action];
  return (
    <section
      aria-label={copy.question}
      className="flex flex-col gap-3 rounded-2xl border-2 border-accent bg-card p-4"
    >
      <h3 className="font-semibold">{copy.question}</h3>
      {view.campaignId ? <p className="text-sm text-muted">Borrador {view.campaignId}</p> : null}
      <ApprovalSummary preview={view.preview} />
      <p className="text-xs text-muted">
        Se aprueba este contenido exacto; cualquier cambio requiere una nueva aprobación.
      </p>
      {phase === "failed" ? (
        <p role="alert" className="text-sm text-negative">
          No se pudo registrar la aprobación. Nada quedó aprobado; puedes intentarlo de nuevo.
        </p>
      ) : null}
      {phase === "changing" ? (
        <ChangeRequestForm
          disabled={locked}
          onCancel={() => setPhase("idle")}
          onSubmit={(changes) => reject(changeRequestOutput(changes))}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={locked}
            onClick={() => void approve()}
            className="h-11 rounded-xl bg-accent px-4 text-accent-foreground disabled:opacity-50"
          >
            {phase === "working" ? "Registrando…" : copy.approve}
          </button>
          <button
            type="button"
            disabled={locked}
            onClick={() => setPhase("changing")}
            className={buttonClass}
          >
            Cambiar
          </button>
          <button
            type="button"
            disabled={locked}
            onClick={() => reject(discardOutput())}
            className={buttonClass}
          >
            Descartar
          </button>
        </div>
      )}
    </section>
  );
}

export function ApprovalPanel({ tool, view }: { tool: ToolView; view: ApprovalView }) {
  const outcome = approvalOutcomeOf(tool.output);
  if (tool.state === "output-available" && outcome) {
    return <p className="text-sm text-muted">{OUTCOME_TEXT[outcome]}</p>;
  }
  return <ActivePanel tool={tool} view={view} />;
}
