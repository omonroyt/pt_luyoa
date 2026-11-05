import { z } from "zod";
import { BlockBase, Unit } from "./base";

export const MAX_CHART_POINTS = 60;
export const MAX_CHART_SERIES = 4;

/**
 * ES: Gráfica de barras, líneas o barras agrupadas (07 §3.1). Cada fila de data tiene la
 *     clave del eje x y una clave por serie.
 * EN: Bar, line or grouped bar chart (07 §3.1). Each data row has the x-axis key and one
 *     key per series.
 */
export const ChartBlock = BlockBase.extend({
  kind: z
    .enum(["bar", "line", "grouped_bar"])
    .describe("bar para comparar elementos, line para tendencias, grouped_bar para dos periodos"),
  x: z.object({ key: z.string(), label: z.string() }).describe("Eje x: clave en data y etiqueta"),
  series: z
    .array(z.object({ key: z.string(), label: z.string(), unit: Unit }))
    .min(1)
    .max(MAX_CHART_SERIES)
    .describe("De 1 a 4 series; cada key debe existir en las filas de data"),
  data: z
    .array(z.record(z.string(), z.union([z.string(), z.number()])))
    .min(1)
    .max(MAX_CHART_POINTS)
    .describe("Filas con las cifras exactas de la herramienta, sin redondear ni calcular"),
  highlight: z
    .object({ x: z.string(), reason: z.string() })
    .optional()
    .describe("Elemento a resaltar, p. ej. el día más bajo, y por qué"),
  sort: z.enum(["asc", "desc", "none"]).optional(),
});
export type ChartBlock = z.infer<typeof ChartBlock>;
