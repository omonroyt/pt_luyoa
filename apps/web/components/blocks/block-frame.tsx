/**
 * ES: Marco común de los bloques (CA-F06): título, subtítulo, periodo, notas y fuentes, en
 *     una tarjeta con sombra suave que entra con animación.
 * EN: Common block frame (CA-F06): title, subtitle, period, notes and sources, in a card
 *     with a soft shadow that enters with an animation.
 */
import type { BlockBase } from "@alborada/shared";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { formatPeriod } from "@/lib/ui/format";
import { SourceChips } from "./source-chips";

export function BlockFrame({ block, children }: { block: BlockBase; children: ReactNode }) {
  return (
    <figure className="flex animate-rise flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <figcaption className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold leading-snug tracking-tight">
            {block.title}
          </h3>
          {block.subtitle ? <p className="text-sm text-muted">{block.subtitle}</p> : null}
        </div>
        <p className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs text-muted">
          <Icon name="calendar" className="size-3.5" />
          {formatPeriod(block.period)}
        </p>
      </figcaption>
      {children}
      {block.notes?.length ? (
        <ul className="flex flex-col gap-1.5 rounded-2xl bg-surface/70 px-3 py-2.5 text-sm text-muted">
          {block.notes.map((note) => (
            <li key={note} className="flex gap-2">
              <Icon name="info" className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <SourceChips ids={block.sources} />
    </figure>
  );
}
