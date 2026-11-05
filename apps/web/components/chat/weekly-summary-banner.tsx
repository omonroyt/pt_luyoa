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
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
    >
      <p className="text-sm">Tu resumen de la semana al {summary.weekEnd} está listo.</p>
      <button
        type="button"
        onClick={() => onOpen(summary.messages)}
        className="min-h-11 rounded-lg border border-accent px-3 text-sm"
      >
        Ver resumen
      </button>
    </section>
  );
}
