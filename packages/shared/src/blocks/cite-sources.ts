import { z } from "zod";
import { SourceRef } from "./base";

/**
 * ES: Fuentes de las cifras que aparecen en el texto de la respuesta (07 §3.5).
 * EN: Sources of the figures that appear in the response text (07 §3.5).
 */
export const CiteSourcesBlock = z.object({
  sources: z.array(SourceRef).min(1).describe("source.id de cada resultado citado en el texto"),
});
export type CiteSourcesBlock = z.infer<typeof CiteSourcesBlock>;
