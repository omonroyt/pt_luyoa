/**
 * ES: Aviso de una respuesta que no se pudo completar. Ofrece "Reintentar" cuando sirve; si
 *     la demo llegó a un tope lo explica, y si la sesión venció lleva a la entrada.
 * EN: Notice for an answer that could not be completed. It offers "Reintentar" when it
 *     helps; if the demo hit a cap it explains it, and if the session expired it links to
 *     the entry.
 */
import { Icon } from "@/components/ui/icon";
import { chatErrorView } from "@/lib/ui/chat-error";

const actionClass =
  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 font-semibold text-accent hover:bg-accent-soft";

export function RetryBanner({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const view = chatErrorView(error);
  return (
    <div
      role="alert"
      className="flex animate-rise items-center justify-between gap-3 rounded-2xl border border-negative/40 bg-negative-soft px-4 py-3 text-sm"
    >
      <span className="flex items-center gap-2">
        <Icon name="alert" className="size-4 shrink-0 text-negative" />
        {view.message}
      </span>
      {view.retryable ? (
        <button type="button" onClick={onRetry} className={actionClass}>
          <Icon name="refresh" className="size-4" />
          Reintentar
        </button>
      ) : null}
      {view.needsAccess ? (
        <a href="/acceso" className={actionClass}>
          Entrar
          <Icon name="arrowRight" className="size-4" />
        </a>
      ) : null}
    </div>
  );
}
