/**
 * ES: Fuentes citadas con cite_sources en un mensaje. Se muestran al final de la respuesta,
 *     debajo del texto que respaldan, sin importar en qué paso las citó el modelo.
 * EN: Sources cited with cite_sources in a message. They are shown at the end of the
 *     answer, below the text they support, regardless of the step where the model cited them.
 */
import { CiteSourcesBlock } from "@alborada/shared";
import type { UIMessage } from "ai";
import { toolViewOf } from "./tool-parts";

export function citedSourcesOf(message: UIMessage): string[] {
  return message.parts.flatMap((part) => {
    const tool = toolViewOf(part);
    if (tool?.name !== "cite_sources" || tool.state !== "output-available") return [];
    const parsed = CiteSourcesBlock.safeParse(tool.input);
    return parsed.success ? parsed.data.sources : [];
  });
}
