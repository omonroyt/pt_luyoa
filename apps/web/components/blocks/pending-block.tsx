/**
 * ES: Marcador de un bloque visual mientras se dibuja o mientras su componente no existe:
 *     una tarjeta con barras que brillan para anticipar la forma del bloque.
 * EN: Placeholder for a visual block while it is drawn or while its component is missing:
 *     a card with shimmering bars that hint at the block's shape.
 */
export function PendingBlock({ label }: { label: string }) {
  return (
    <div className="flex animate-fade flex-col gap-3 rounded-2xl border border-border bg-card/70 p-4">
      <p className="text-sm text-muted">{label}…</p>
      <div aria-hidden="true" className="flex flex-col gap-2">
        <span className="skeleton h-3 w-2/5 animate-shimmer rounded-full" />
        <span className="skeleton h-3 w-4/5 animate-shimmer rounded-full" />
        <span className="skeleton h-3 w-3/5 animate-shimmer rounded-full" />
      </div>
    </div>
  );
}
