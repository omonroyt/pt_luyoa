/**
 * ES: Indicadores (07 §3.3): cifra, valor anterior y variación con flecha y color según
 *     goodWhen; la flecha y el signo hacen que el color no sea la única señal. Las cifras
 *     numéricas suben desde cero al aparecer.
 * EN: Indicators (07 §3.3): figure, previous value and change with arrow and color by
 *     goodWhen; the arrow and sign keep color from being the only cue. Numeric figures
 *     count up from zero when they appear.
 */
import type { KpisBlock as KpisData } from "@alborada/shared";
import { deltaTone, formatDelta, formatValue } from "@/lib/ui/format";
import { BlockFrame } from "./block-frame";
import { CountUp } from "./count-up";

type Item = KpisData["items"][number];

const TONE_CLASS = {
  good: "bg-positive-soft text-positive",
  bad: "bg-negative-soft text-negative",
  neutral: "bg-surface text-muted",
};

function Delta({ percent, goodWhen }: { percent: number; goodWhen?: "up" | "down" }) {
  const arrow = percent > 0 ? "▲" : "▼";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${TONE_CLASS[deltaTone(percent, goodWhen)]}`}
    >
      <span aria-hidden="true">{percent === 0 ? "■" : arrow}</span> {formatDelta(percent)}
    </span>
  );
}

function Figure({ item }: { item: Item }) {
  if (typeof item.value !== "number") return <>{formatValue(item.value, item.unit)}</>;
  return <CountUp value={item.value} format={(value) => formatValue(value, item.unit)} />;
}

export function KpisBlock({ block }: { block: KpisData }) {
  return (
    <BlockFrame block={block}>
      {block.comparisonLabel ? (
        <p className="-mt-2 text-sm text-muted">{block.comparisonLabel}</p>
      ) : null}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {block.items.map((item, index) => (
          <div
            key={item.key}
            className="relative flex animate-rise flex-col gap-1.5 overflow-hidden rounded-2xl border border-border bg-surface/50 p-3 sm:p-4"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">{item.label}</dt>
            <dd className="font-display text-2xl font-semibold tabular-nums tracking-tight sm:text-[28px]">
              <Figure item={item} />
            </dd>
            {item.deltaPct !== undefined ? (
              <dd>
                <Delta percent={item.deltaPct} goodWhen={item.goodWhen} />
              </dd>
            ) : null}
            {item.previous !== undefined ? (
              <dd className="text-xs text-muted">Antes: {formatValue(item.previous, item.unit)}</dd>
            ) : null}
          </div>
        ))}
      </dl>
    </BlockFrame>
  );
}
