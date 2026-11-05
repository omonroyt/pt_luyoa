/**
 * ES: Preparación de los datos de una gráfica (07 §3.1): orden pedido por el bloque, color
 *     fijo por serie y columnas de la tabla equivalente "Ver datos".
 * EN: Chart data preparation (07 §3.1): order requested by the block, fixed color per
 *     series and columns of the equivalent "Ver datos" table.
 */
import type { ChartBlock, Unit } from "@alborada/shared";

// ES: Paleta categórica fija; las variables viven en globals.css con su valor oscuro.
// EN: Fixed categorical palette; the variables live in globals.css with their dark value.
export const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
];

type Row = ChartBlock["data"][number];

const numeric = (value: Row[string] | undefined) => (typeof value === "number" ? value : 0);

export function sortedData(block: ChartBlock): Row[] {
  const firstSeries = block.series[0]?.key ?? "";
  if (!block.sort || block.sort === "none") return block.data;
  const direction = block.sort === "asc" ? 1 : -1;
  return [...block.data].sort(
    (a, b) => direction * (numeric(a[firstSeries]) - numeric(b[firstSeries])),
  );
}

export type DataColumn = { key: string; label: string; unit?: Unit };

export function tableColumns(block: ChartBlock): DataColumn[] {
  return [
    { key: block.x.key, label: block.x.label },
    ...block.series.map((series) => ({ key: series.key, label: series.label, unit: series.unit })),
  ];
}
