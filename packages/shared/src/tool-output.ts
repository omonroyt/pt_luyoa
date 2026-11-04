import type { Source } from "./source";

/**
 * ES: Forma común de toda respuesta exitosa de una herramienta del MCP: datos ya
 *     calculados, aclaraciones (notes), advertencias (warnings) y procedencia.
 * EN: Common shape of every successful MCP tool response: precomputed data,
 *     clarifications (notes), warnings and provenance.
 */
export type ToolOutput<TData> = {
  data: TData;
  notes: string[];
  warnings: string[];
  source: Source;
};
