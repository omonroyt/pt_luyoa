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
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
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

const OUTCOME_ICON = { approved: "check", changes: "refresh", discarded: "close" } as const;

type Phase = "idle" | "working" | "changing" | "failed";

const buttonClass =
  "h-11 rounded-xl border border-border bg-card px-4 font-medium transition hover:border-accent/50 hover:bg-accent-soft disabled:opacity-50";

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

type Actions = ReturnType<typeof useApprovalActions>;

function PanelHeader({ question, campaignId }: { question: string; campaignId?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon name="shield" className="size-7 shrink-0 text-accent" />
      <div>
        <h3 className="font-display text-lg font-semibold">{question}</h3>
        <p className="text-xs text-muted">
          {campaignId ? `Borrador ${campaignId} · ` : ""}Requiere tu aprobación
        </p>
      </div>
    </div>
  );
}

function PanelButtons({ actions, approveLabel }: { actions: Actions; approveLabel: string }) {
  const { phase, setPhase, approve, reject, locked } = actions;
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={locked}
        onClick={() => void approve()}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 font-semibold text-accent-foreground shadow-soft transition hover:bg-accent-strong disabled:opacity-50"
      >
        <Icon name="check" className="size-4" />
        {phase === "working" ? "Registrando…" : approveLabel}
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
  );
}

function ActivePanel({ tool, view }: { tool: ToolView; view: ApprovalView }) {
  const actions = useApprovalActions(tool, view);
  const copy = COPY[view.action];
  // ES: La entrada de texto se bloquea al llegar la aprobación; el foco pasa al panel.
  // EN: The text input is locked when the approval arrives; focus moves to the panel.
  const section = useRef<HTMLElement>(null);
  useEffect(() => section.current?.focus(), []);
  return (
    <section
      ref={section}
      tabIndex={-1}
      aria-label={copy.question}
      className="animate-rise rounded-3xl border-2 border-accent bg-card shadow-lift"
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <PanelHeader question={copy.question} campaignId={view.campaignId} />
        <ApprovalSummary preview={view.preview} />
        <p className="text-xs text-muted">
          Se aprueba este contenido exacto; cualquier cambio requiere una nueva aprobación.
        </p>
        {actions.phase === "failed" ? (
          <p role="alert" className="text-sm text-negative">
            No se pudo registrar la aprobación. Nada quedó aprobado; puedes intentarlo de nuevo.
          </p>
        ) : null}
        {actions.phase === "changing" ? (
          <ChangeRequestForm
            disabled={actions.locked}
            onCancel={() => actions.setPhase("idle")}
            onSubmit={(changes) => actions.reject(changeRequestOutput(changes))}
          />
        ) : (
          <PanelButtons actions={actions} approveLabel={copy.approve} />
        )}
      </div>
    </section>
  );
}

export function ApprovalPanel({ tool, view }: { tool: ToolView; view: ApprovalView }) {
  const outcome = approvalOutcomeOf(tool.output);
  if (tool.state === "output-available" && outcome) {
    return (
      <p className="inline-flex animate-fade items-center gap-2 self-start rounded-full border border-border bg-card/70 px-3 py-1.5 text-sm text-muted">
        <Icon
          name={OUTCOME_ICON[outcome]}
          className={`size-4 ${outcome === "approved" ? "text-positive" : ""}`}
        />
        {OUTCOME_TEXT[outcome]}
      </p>
    );
  }
  return <ActivePanel tool={tool} view={view} />;
}
