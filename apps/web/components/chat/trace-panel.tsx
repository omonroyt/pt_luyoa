"use client";

/**
 * ES: Panel de trazas (07 §4, IMP-43): pasos del turno y totales de tokens, costo, tiempo y
 *     modelo, más el costo acumulado de la conversación (CA-Q06). En escritorio es una
 *     columna lateral y en celular una hoja inferior. La traza se guarda al terminar el
 *     turno, así que se vuelve a pedir cuando el chat queda libre.
 * EN: Trace panel (07 §4, IMP-43): turn steps and totals for tokens, cost, time and model,
 *     plus the accumulated conversation cost (CA-Q06). On desktop it is a side column and
 *     on mobile a bottom sheet. The trace is stored when the turn ends, so it is requested
 *     again when the chat becomes idle.
 */
import { useEffect, useState } from "react";
import {
  fetchStoredTrace,
  formatMs,
  formatTokens,
  formatUsd,
  traceTotals,
  type TraceResponse,
} from "@/lib/ui/trace";
import { TraceStepItem } from "./trace-step-item";
import { useDialogFocus } from "./use-dialog-focus";

type TracePanelProps = {
  conversationId: string;
  messageId: string;
  busy: boolean;
  onClose: () => void;
};

type TraceState =
  { status: "loading" } | { status: "error" } | { status: "ready"; trace: TraceResponse };

// ES: El estado solo se actualiza al llegar la respuesta; "cargando" se deriva de que el
//     resultado guardado sea de otra solicitud (recarga o mensaje distinto).
// EN: State is only updated when the response arrives; "loading" is derived from the
//     stored result belonging to another request (reload or different message).
function useMessageTrace(conversationId: string, messageId: string, busy: boolean) {
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState<{ key: string; state: TraceState }>();
  const key = `${messageId}:${reloads}`;
  useEffect(() => {
    if (busy) return;
    let active = true;
    const settle = (state: TraceState) => active && setResult({ key, state });
    fetchStoredTrace(conversationId, messageId)
      .then((trace) => settle({ status: "ready", trace }))
      .catch(() => settle({ status: "error" }));
    return () => {
      active = false;
    };
  }, [busy, key, conversationId, messageId]);
  const state: TraceState = result?.key === key ? result.state : { status: "loading" };
  return { state, reload: () => setReloads((count) => count + 1) };
}

function Totals({ trace }: { trace: TraceResponse }) {
  const totals = traceTotals(trace.steps);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-border pt-3 text-sm [&_dt]:text-muted">
      <dt>Tokens</dt>
      <dd>
        {formatTokens(totals.tokensIn)} entrada / {formatTokens(totals.tokensOut)} salida
      </dd>
      <dt>Costo</dt>
      <dd>{formatUsd(totals.costUsd)}</dd>
      <dt>Tiempo</dt>
      <dd>{formatMs(totals.latencyMs)} (modelo + herramientas)</dd>
      <dt>Llamadas</dt>
      <dd>
        {totals.llmCalls} al modelo · {totals.toolCalls} herramientas
      </dd>
      <dt>Modelo</dt>
      <dd className="break-all font-mono text-xs">{totals.model ?? "—"}</dd>
      <dt>Conversación</dt>
      <dd>{formatUsd(trace.conversationCostUsd ?? 0)} acumulado</dd>
    </dl>
  );
}

function TraceNotice({ text, onReload }: { text: string; onReload: () => void }) {
  return (
    <p className="text-sm text-muted">
      {text}{" "}
      <button type="button" onClick={onReload} className="text-accent">
        Actualizar
      </button>
    </p>
  );
}

function TraceBody({ state, onReload }: { state: TraceState; onReload: () => void }) {
  if (state.status === "loading") return <p className="text-sm text-muted">Cargando la traza…</p>;
  if (state.status === "error") {
    return <TraceNotice text="No se pudo leer la traza." onReload={onReload} />;
  }
  const { trace } = state;
  if (trace.steps.length === 0) {
    return <TraceNotice text="La traza aún no está guardada." onReload={onReload} />;
  }
  return (
    <>
      <ol>
        {trace.steps.map((step, index) => (
          <TraceStepItem key={index} step={step} index={index} />
        ))}
      </ol>
      <Totals trace={trace} />
    </>
  );
}

export function TracePanel({ conversationId, messageId, busy, onClose }: TracePanelProps) {
  const { state, reload } = useMessageTrace(conversationId, messageId, busy);
  const panel = useDialogFocus<HTMLElement>(onClose);
  return (
    <aside
      ref={panel}
      tabIndex={-1}
      aria-label="Trazas del turno"
      className="fixed inset-x-0 bottom-0 z-20 flex max-h-[70dvh] flex-col gap-3 overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 shadow-lg md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-96 md:rounded-none md:border-l md:border-t-0"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Trazas del turno</h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-lg border border-border px-3 text-sm"
        >
          Cerrar
        </button>
      </div>
      <TraceBody state={state} onReload={reload} />
    </aside>
  );
}
