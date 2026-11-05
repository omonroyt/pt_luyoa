"use client";

/**
 * ES: Chat sin mensajes: la invitación a preguntar y, si hay uno guardado, el aviso del
 *     resumen semanal listo.
 * EN: Chat without messages: the invitation to ask and, if one is stored, the ready weekly
 *     summary notice.
 */
import type { UIMessage } from "ai";
import { WeeklySummaryBanner } from "./weekly-summary-banner";

export function EmptyChat({ onOpenSummary }: { onOpenSummary: (messages: UIMessage[]) => void }) {
  return (
    <>
      <p className="text-muted">
        Pregúntame cómo va tu negocio: ventas, sucursales, clientes y campañas.
      </p>
      <WeeklySummaryBanner onOpen={onOpenSummary} />
    </>
  );
}
