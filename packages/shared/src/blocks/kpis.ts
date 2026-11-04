import { z } from "zod";
import { BlockBase, Unit } from "./base";

/**
 * ES: De 2 a 4 cifras clave con su variación (07 §3.3). Las variaciones son las que
 *     calculó el MCP, nunca el modelo (ADR-09).
 * EN: Two to four key figures with their change (07 §3.3). Changes are the ones computed
 *     by the MCP, never by the model (ADR-09).
 */
export const KpisBlock = BlockBase.extend({
  comparisonLabel: z.string().optional().describe('Contra qué se compara, p. ej. "vs septiembre"'),
  items: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        value: z.number().describe("Cifra exacta de la herramienta"),
        unit: Unit,
        previous: z
          .number()
          .optional()
          .describe("Valor del periodo anterior, si la herramienta lo dio"),
        deltaAbs: z.number().optional().describe("Variación absoluta calculada por la herramienta"),
        deltaPct: z
          .number()
          .optional()
          .describe("Variación porcentual calculada por la herramienta"),
        goodWhen: z.enum(["up", "down"]).optional().describe("Si subir es bueno o malo"),
      }),
    )
    .min(2)
    .max(4),
});
export type KpisBlock = z.infer<typeof KpisBlock>;
