/**
 * ES: Indicadores (07 §3.3): cifra, valor anterior y variación con flecha y color según
 *     goodWhen; la flecha y el signo hacen que el color no sea la única señal.
 * EN: Indicators (07 §3.3): figure, previous value and change with arrow and color by
 *     goodWhen; the arrow and sign keep color from being the only cue.
 */
import type { KpisBlock as KpisData } from "@alborada/shared";
import { deltaTone, formatDelta, formatValue } from "@/lib/ui/format";
import { BlockFrame } from "./block-frame";

const TONE_CLASS = { good: "text-positive", bad: "text-negative", neutral: "text-muted" };

function Delta({ percent, goodWhen }: { percent: number; goodWhen?: "up" | "down" }) {
  const arrow = percent > 0 ? "▲" : "▼";
  return (
    <span className={`text-sm ${TONE_CLASS[deltaTone(percent, goodWhen)]}`}>
      <span aria-hidden="true">{percent === 0 ? "■" : arrow}</span> {formatDelta(percent)}
    </span>
  );
}

export function KpisBlock({ block }: { block: KpisData }) {
  return (
    <BlockFrame block={block}>
      {block.comparisonLabel ? <p className="text-sm text-muted">{block.comparisonLabel}</p> : null}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {block.items.map((item) => (
          <div key={item.key} className="rounded-xl border border-border p-3">
            <dt className="text-sm text-muted">{item.label}</dt>
            <dd className="text-xl font-semibold">{formatValue(item.value, item.unit)}</dd>
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
