/**
 * ES: Fuentes de la conversación para el chip de fuente (07 §3.5, CA-R02): se leen de los
 *     resultados del MCP que ya están en los mensajes, así que la interfaz muestra la misma
 *     procedencia que usó el verificador de cifras.
 * EN: Conversation sources for the source chip (07 §3.5, CA-R02): they are read from the
 *     MCP results already in the messages, so the UI shows the same provenance the figure
 *     verifier used.
 */
import type { Source } from "@alborada/shared";
import type { UIMessage } from "ai";
import { sourceOf } from "./tool-result";

export function collectSources(messages: UIMessage[]): Map<string, Source> {
  const sources = new Map<string, Source>();
  for (const message of messages) {
    for (const part of message.parts) {
      const source = "output" in part ? sourceOf(part.output) : undefined;
      if (source) sources.set(source.id, source);
    }
  }
  return sources;
}
