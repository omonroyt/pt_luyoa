/**
 * ES: Marcador de un bloque visual mientras se dibuja o mientras su componente no existe.
 * EN: Placeholder for a visual block while it is drawn or while its component is missing.
 */
export function PendingBlock({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted">
      {label}
    </div>
  );
}
