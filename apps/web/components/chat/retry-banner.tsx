/**
 * ES: Aviso de una respuesta que no se pudo completar, con el botón "Reintentar".
 * EN: Notice for an answer that could not be completed, with the "Reintentar" button.
 */
import { Icon } from "@/components/ui/icon";

export function RetryBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex animate-rise items-center justify-between gap-3 rounded-2xl border border-negative/40 bg-negative-soft px-4 py-3 text-sm"
    >
      <span className="flex items-center gap-2">
        <Icon name="alert" className="size-4 text-negative" />
        No pude completar la respuesta. ¿Lo intento de nuevo?
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold text-accent hover:bg-accent-soft"
      >
        <Icon name="refresh" className="size-4" />
        Reintentar
      </button>
    </div>
  );
}
