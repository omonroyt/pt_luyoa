"use client";

/**
 * ES: Aviso del resumen semanal listo (X-02, 06 §12.1): si el cron dejó un resumen y el chat
 *     está vacío, ofrece abrirlo. Al abrirlo, la pregunta y la respuesta guardadas se cargan
 *     como mensajes del chat, y la persona puede seguir preguntando sobre ellas.
 * EN: Ready weekly summary notice (X-02, 06 §12.1): if the cron left a summary and the chat
 *     is empty, it offers to open it. When opened, the stored question and answer are
 *     loaded as chat messages, and the person can keep asking about them.
 */
import type { UIMessage } from "ai";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { fetchLatestSummary, type StoredSummary } from "@/lib/ui/weekly-summary";

export function WeeklySummaryBanner({ onOpen }: { onOpen: (messages: UIMessage[]) => void }) {
  const [summary, setSummary] = useState<StoredSummary | null>(null);
  useEffect(() => {
    let active = true;
    fetchLatestSummary()
      .then((latest) => active && setSummary(latest))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  if (!summary) return null;
  return (
    <section
      aria-label="Resumen de la semana"
      className="flex animate-rise flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <Icon name="sparkles" className="size-6 shrink-0 text-accent" />
        <div>
          <p className="text-sm font-semibold">Tu resumen de la semana está listo</p>
          <p className="text-xs text-muted">Semana al {summary.weekEnd}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onOpen(summary.messages)}
        className="group inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:bg-accent-strong"
      >
        Ver resumen
        <Icon
          name="arrowRight"
          className="size-4 transition-transform group-hover:translate-x-0.5"
        />
      </button>
    </section>
  );
}
