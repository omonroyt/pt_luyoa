/**
 * ES: Marco común de los bloques (CA-F06): título, subtítulo, periodo, notas y fuentes.
 * EN: Common block frame (CA-F06): title, subtitle, period, notes and sources.
 */
import type { BlockBase } from "@alborada/shared";
import type { ReactNode } from "react";
import { formatPeriod } from "@/lib/ui/format";
import { SourceChips } from "./source-chips";

export function BlockFrame({ block, children }: { block: BlockBase; children: ReactNode }) {
  return (
    <figure className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <figcaption>
        <h3 className="font-semibold">{block.title}</h3>
        {block.subtitle ? <p className="text-sm text-muted">{block.subtitle}</p> : null}
        <p className="text-xs text-muted">{formatPeriod(block.period)}</p>
      </figcaption>
      {children}
      {block.notes?.length ? (
        <ul className="flex flex-col gap-1 text-sm text-muted">
          {block.notes.map((note) => (
            <li key={note}>ⓘ {note}</li>
          ))}
        </ul>
      ) : null}
      <SourceChips ids={block.sources} />
    </figure>
  );
}
