"use client";

/**
 * ES: Encabezado del chat con los botones que abren el panel de preferencias y el de trazas.
 * EN: Chat header with the buttons that open the preferences panel and the trace panel.
 */
type ChatHeaderProps = {
  traceAvailable: boolean;
  onShowPreferences: () => void;
  onShowTrace: () => void;
};

export function ChatHeader({ traceAvailable, onShowPreferences, onShowTrace }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-2 border-b border-border pb-3">
      <h1 className="text-lg font-semibold">☕ Café Alborada · Copiloto</h1>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onShowPreferences}
          className="rounded-lg border border-border px-3 py-1 text-sm"
        >
          Preferencias
        </button>
        <button
          type="button"
          disabled={!traceAvailable}
          onClick={onShowTrace}
          className="rounded-lg border border-border px-3 py-1 text-sm disabled:opacity-50"
        >
          Trazas
        </button>
      </div>
    </header>
  );
}
