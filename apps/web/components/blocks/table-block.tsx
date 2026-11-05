/**
 * ES: Bloque de tabla (07 §3.2).
 * EN: Table block (07 §3.2).
 */
import type { TableBlock as TableData } from "@alborada/shared";
import { BlockFrame } from "./block-frame";
import { DataTable } from "./data-table";

export function TableBlock({ block }: { block: TableData }) {
  return (
    <BlockFrame block={block}>
      <DataTable columns={block.columns} rows={block.rows} totalRow={block.totalRow} />
      {block.footnote ? <p className="text-xs text-muted">{block.footnote}</p> : null}
    </BlockFrame>
  );
}
