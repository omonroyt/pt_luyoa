import { z } from "zod";

/**
 * ES: Fecha local (America/Mexico_City) en formato AAAA-MM-DD.
 * EN: Local date (America/Mexico_City) in YYYY-MM-DD format.
 */
export const LocalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: AAAA-MM-DD");

export const Period = z.object({
  from: LocalDate,
  to: LocalDate,
  label: z.string().optional(),
});
export type Period = z.infer<typeof Period>;

/**
 * ES: Procedencia de un resultado de herramienta. Toda cifra que ve la dueña
 *     debe poder rastrearse a una de estas fuentes (B-06).
 * EN: Provenance of a tool result. Every figure the owner sees must be
 *     traceable to one of these sources (B-06).
 */
export const Source = z.object({
  id: z.string(),
  tool: z.string(),
  endpoints: z.array(z.string()).min(1),
  period: Period.extend({ timezone: z.literal("America/Mexico_City") }).optional(),
  data_as_of: LocalDate,
  fetched_at: z.string(),
});
export type Source = z.infer<typeof Source>;
