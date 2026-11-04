import { z } from "zod";
import { BlockBase, Unit } from "./base";

export const MAX_TABLE_ROWS = 25;

const Cell = z.union([z.string(), z.number(), z.null()]);

/**
 * ES: Tabla para listados con tres o más atributos (07 §3.2).
 * EN: Table for listings with three or more attributes (07 §3.2).
 */
export const TableBlock = BlockBase.extend({
  columns: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        unit: Unit.optional(),
        align: z.enum(["left", "right"]).optional(),
        emphasis: z.boolean().optional().describe("Resalta la columna clave, p. ej. el lift"),
      }),
    )
    .min(2)
    .describe("Columnas; cada key debe existir en las filas"),
  rows: z
    .array(z.record(z.string(), Cell))
    .min(1)
    .max(MAX_TABLE_ROWS)
    .describe("Filas con las cifras exactas de la herramienta; null si no hay dato"),
  totalRow: z
    .record(z.string(), Cell)
    .optional()
    .describe("Fila de totales, solo si la herramienta entregó el total"),
  footnote: z.string().optional(),
});
export type TableBlock = z.infer<typeof TableBlock>;
