/**
 * ES: Bloque de gráfica (07 §3.1). La gráfica es decorativa para lectores de pantalla
 *     (aria-hidden): la tabla equivalente "Ver datos" lleva las mismas cifras (07 §5).
 * EN: Chart block (07 §3.1). The chart is decorative for screen readers (aria-hidden):
 *     the equivalent "Ver datos" table carries the same figures (07 §5).
 */
import type { ChartBlock as ChartData } from "@alborada/shared";
import { Icon } from "@/components/ui/icon";
import { sortedData, tableColumns } from "@/lib/ui/chart-data";
import { BlockFrame } from "./block-frame";
import { ChartCanvas } from "./chart-canvas";
import { DataTable } from "./data-table";

export function ChartBlock({ block }: { block: ChartData }) {
  const data = sortedData(block);
  return (
    <BlockFrame block={block}>
      <div aria-hidden="true" className="-ml-2">
        <ChartCanvas block={block} data={data} />
      </div>
      {block.highlight ? (
        <p className="flex items-start gap-2 rounded-2xl border border-accent/25 bg-accent-soft px-3 py-2.5 text-sm">
          <Icon name="sparkles" className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>
            <strong>{block.highlight.x}</strong>: {block.highlight.reason}
          </span>
        </p>
      ) : null}
      <details className="group text-sm">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-1 py-0.5 font-medium text-accent hover:bg-accent-soft">
          <Icon name="table" className="size-4" />
          Ver datos
          <Icon name="chevronDown" className="size-4 transition group-open:rotate-180" />
        </summary>
        <div className="mt-2">
          <DataTable columns={tableColumns(block)} rows={data} />
        </div>
      </details>
    </BlockFrame>
  );
}
