"use client";

/**
 * ES: Panel de preferencias guardadas (X-04, 06_DISENO_AGENTE §12.2): muestra lo que el
 *     agente recuerda del negocio y permite borrar cada preferencia. Se vuelve a leer
 *     cuando el chat queda libre, porque el agente puede guardar una durante el turno.
 * EN: Stored preferences panel (X-04, 06_DISENO_AGENTE §12.2): it shows what the agent
 *     remembers about the business and lets the owner delete each preference. It is read
 *     again when the chat becomes idle, since the agent may store one during the turn.
 */
import { useEffect, useState } from "react";
import { fetchPreferences, forgetPreference, type SavedPreference } from "@/lib/ui/preferences";
import { useDialogFocus } from "./use-dialog-focus";

type PanelState =
  { status: "loading" } | { status: "error" } | { status: "ready"; preferences: SavedPreference[] };

function usePreferences(busy: boolean) {
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState<{ key: number; state: PanelState }>();
  useEffect(() => {
    if (busy) return;
    let active = true;
    const settle = (state: PanelState) => active && setResult({ key: reloads, state });
    fetchPreferences()
      .then((preferences) => settle({ status: "ready", preferences }))
      .catch(() => settle({ status: "error" }));
    return () => {
      active = false;
    };
  }, [busy, reloads]);
  const state: PanelState = result?.key === reloads ? result.state : { status: "loading" };
  return { state, reload: () => setReloads((count) => count + 1) };
}

function PreferenceItem({ item, onForget }: { item: SavedPreference; onForget: () => void }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border py-2">
      <div className="min-w-0">
        <p className="text-sm text-muted">{item.label}</p>
        <p className="break-words">{item.value}</p>
      </div>
      <button
        type="button"
        onClick={onForget}
        aria-label={`Olvidar ${item.label}`}
        className="min-h-11 shrink-0 rounded-lg border border-border px-3 text-sm"
      >
        Olvidar
      </button>
    </li>
  );
}

function PreferencesBody({
  state,
  onForget,
}: {
  state: PanelState;
  onForget: (key: string) => void;
}) {
  if (state.status === "loading") return <p className="text-sm text-muted">Cargando…</p>;
  if (state.status === "error") {
    return <p className="text-sm text-muted">No se pudieron leer las preferencias.</p>;
  }
  if (state.preferences.length === 0) {
    return (
      <p className="text-sm text-muted">
        Aún no hay preferencias. Dile al copiloto, por ejemplo, &quot;prefiero WhatsApp para mis
        campañas&quot;.
      </p>
    );
  }
  return (
    <ul>
      {state.preferences.map((item) => (
        <PreferenceItem key={item.key} item={item} onForget={() => onForget(item.key)} />
      ))}
    </ul>
  );
}

export function PreferencesPanel({ busy, onClose }: { busy: boolean; onClose: () => void }) {
  const { state, reload } = usePreferences(busy);
  const [failed, setFailed] = useState(false);
  const panel = useDialogFocus<HTMLElement>(onClose);
  const forget = (key: string) => {
    setFailed(false);
    forgetPreference(key)
      .then(reload)
      .catch(() => setFailed(true));
  };
  return (
    <aside
      ref={panel}
      tabIndex={-1}
      aria-label="Preferencias guardadas"
      className="fixed inset-x-0 bottom-0 z-20 flex max-h-[75dvh] animate-sheet-up flex-col gap-3 overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-lift md:inset-y-3 md:left-auto md:right-3 md:max-h-none md:w-[400px] md:animate-slide-in md:rounded-3xl"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Preferencias guardadas</h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-xl border border-border px-3 text-sm transition hover:bg-surface"
        >
          Cerrar
        </button>
      </div>
      <p className="text-sm text-muted">
        El copiloto las aplica en cada conversación nueva de este negocio.
      </p>
      <PreferencesBody state={state} onForget={forget} />
      {failed ? (
        <p role="alert" className="text-sm text-negative">
          No se pudo borrar. Intenta de nuevo.
        </p>
      ) : null}
    </aside>
  );
}
