/**
 * ES: Bloque de gráfica (07 §3.1). La gráfica es decorativa para lectores de pantalla
 *     (aria-hidden): la tabla equivalente "Ver datos" lleva las mismas cifras (07 §5).
 * EN: Chart block (07 §3.1). The chart is decorative for screen readers (aria-hidden):
 *     the equivalent "Ver datos" table carries the same figures (07 §5).
 */
import type { ChartBlock as ChartData } from "@alborada/shared";
import { sortedData, tableColumns } from "@/lib/ui/chart-data";
import { BlockFrame } from "./block-frame";
import { ChartCanvas } from "./chart-canvas";
import { DataTable } from "./data-table";

export function ChartBlock({ block }: { block: ChartData }) {
  const data = sortedData(block);
  return (
    <BlockFrame block={block}>
      <div aria-hidden="true">
        <ChartCanvas block={block} data={data} />
      </div>
      {block.highlight ? (
        <p className="text-sm">
          <span aria-hidden="true">◀ </span>
          <strong>{block.highlight.x}</strong>: {block.highlight.reason}
        </p>
      ) : null}
      <details className="text-sm">
        <summary className="cursor-pointer text-accent">Ver datos</summary>
        <DataTable columns={tableColumns(block)} rows={data} />
      </details>
    </BlockFrame>
  );
}
