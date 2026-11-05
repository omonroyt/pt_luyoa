/**
 * ES: Tabla de datos con desplazamiento horizontal dentro de su tarjeta (la página no se
 *     desplaza a los lados en 375 px). La usan el bloque de tabla y el "Ver datos" de las
 *     gráficas.
 * EN: Data table with horizontal scrolling inside its card (the page does not scroll
 *     sideways at 375 px). Used by the table block and by the charts' "Ver datos".
 */
import type { TableBlock, Unit } from "@alborada/shared";
import { formatValue } from "@/lib/ui/format";

type Column = {
  key: string;
  label: string;
  unit?: Unit;
  align?: "left" | "right";
  emphasis?: boolean;
};
type Row = TableBlock["rows"][number];

function cellClass(column: Column, index: number): string {
  const align = column.align ?? (index === 0 ? "left" : "right");
  return `px-3 py-2 ${align === "right" ? "text-right" : "text-left"} ${column.emphasis ? "font-semibold" : ""}`;
}

export function DataTable({
  columns,
  rows,
  totalRow,
}: {
  columns: Column[];
  rows: Row[];
  totalRow?: Row;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-muted">
            {columns.map((column, index) => (
              <th key={column.key} scope="col" className={cellClass(column, index)}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...rows, ...(totalRow ? [totalRow] : [])].map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={rowIndex === rows.length ? "border-t border-border font-semibold" : ""}
            >
              {columns.map((column, index) => (
                <td key={column.key} className={cellClass(column, index)}>
                  {formatValue(row[column.key], column.unit)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
