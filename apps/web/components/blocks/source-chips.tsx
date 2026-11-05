"use client";

/**
 * ES: Chips "Fuente: …" de un bloque o de la respuesta (07 §3.5, CA-R02). Cada chip se
 *     abre para mostrar la herramienta, los endpoints, el periodo, la fecha de corte y
 *     cuándo se consultó; usa <details>, accesible con teclado sin código extra.
 * EN: "Fuente: …" chips of a block or of the answer (07 §3.5, CA-R02). Each chip opens to
 *     show the tool, endpoints, period, cutoff date and when it was queried; it uses
 *     <details>, keyboard-accessible without extra code.
 */
import { Icon } from "@/components/ui/icon";
import { sourceLabel } from "@/lib/ui/tool-parts";
import { useSource } from "./sources-context";

function SourceChip({ id }: { id: string }) {
  const source = useSource(id);
  return (
    <details className="group rounded-xl border border-border bg-surface/60 text-xs transition open:bg-card open:shadow-soft">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-1.5 text-muted transition hover:text-foreground group-open:text-foreground">
        <Icon name="database" className="size-3.5 text-accent" />
        Fuente: {source ? sourceLabel(source.tool) : id}
      </summary>
      <dl className="grid gap-1 border-t border-border px-3 py-2 [&_dt]:text-muted">
        <dt>Fuente</dt>
        <dd>
          {id} · {source?.tool ?? "no disponible en esta conversación"}
        </dd>
        {source ? (
          <>
            <dt>Consultas a la API</dt>
            <dd className="break-all font-mono">{source.endpoints.join(" · ")}</dd>
            {source.period ? (
              <>
                <dt>Periodo</dt>
                <dd>
                  {source.period.from} a {source.period.to} ({source.period.timezone})
                </dd>
              </>
            ) : null}
            <dt>Datos a</dt>
            <dd>
              {source.data_as_of} · consultado {source.fetched_at.slice(0, 16).replace("T", " ")}
            </dd>
          </>
        ) : null}
      </dl>
    </details>
  );
}

export function SourceChips({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <div className="flex flex-wrap items-start gap-2" aria-label="Fuentes">
      {[...new Set(ids)].map((id) => (
        <SourceChip key={id} id={id} />
      ))}
    </div>
  );
}
