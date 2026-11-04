import { z } from "zod";
import { Period } from "../source";

/**
 * ES: Referencia a la fuente de un resultado de herramienta (Source.id), por ejemplo
 *     "src_d9f5b950bf". Todo bloque con cifras cita al menos una (07 §2, B-06).
 * EN: Reference to the source of a tool result (Source.id), for example
 *     "src_d9f5b950bf". Every block with figures cites at least one (07 §2, B-06).
 */
export const SourceRef = z
  .string()
  .regex(/^src_[0-9a-f]{10}$/, "Usa el source.id exacto de un resultado, p. ej. src_d9f5b950bf")
  .describe("source.id de un resultado de herramienta de esta conversación");
export type SourceRef = z.infer<typeof SourceRef>;

export const Unit = z
  .enum(["mxn", "count", "percent", "per_day", "ratio"])
  .describe("Unidad: mxn (pesos), count (conteo), percent, per_day (por día) o ratio");
export type Unit = z.infer<typeof Unit>;

/**
 * ES: Campos comunes de los bloques visuales: título, periodo, fuentes y notas que deben
 *     verse junto al visual.
 * EN: Fields shared by the visual blocks: title, period, sources and notes that must be
 *     shown next to the visual.
 */
export const BlockBase = z.object({
  title: z.string().min(1).describe("Título breve en español"),
  subtitle: z.string().optional().describe('Aclaración, p. ej. "Utilidad antes de descuentos"'),
  period: Period.describe("Periodo de las cifras, tal como lo devolvió la herramienta"),
  sources: z.array(SourceRef).min(1).describe("Fuentes que respaldan cada cifra del bloque"),
  notes: z.array(z.string()).optional().describe("Advertencias que deben verse junto al visual"),
});
export type BlockBase = z.infer<typeof BlockBase>;
