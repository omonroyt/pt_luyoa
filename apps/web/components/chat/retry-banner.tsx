/**
 * ES: Aviso de una respuesta que no se pudo completar, con el botón "Reintentar".
 * EN: Notice for an answer that could not be completed, with the "Reintentar" button.
 */
export function RetryBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-xl border border-negative px-4 py-3 text-sm"
    >
      <span>No pude completar la respuesta. ¿Lo intento de nuevo?</span>
      <button type="button" onClick={onRetry} className="font-medium text-accent">
        Reintentar
      </button>
    </div>
  );
}
