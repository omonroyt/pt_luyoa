/**
 * ES: Un mensaje del hilo. Los de la dueña van alineados a la derecha; los del copiloto
 *     ocupan el ancho para dar espacio a gráficas y tablas.
 * EN: A thread message. The owner's messages are right-aligned; the copilot's use the full
 *     width to leave room for charts and tables.
 */
import type { UIMessage } from "ai";
import { SourceChips } from "@/components/blocks/source-chips";
import { citedSourcesOf } from "@/lib/ui/cited-sources";
import { PartView } from "./part-view";

type MessageItemProps = { message: UIMessage; onShowTrace: (messageId: string) => void };

export function MessageItem({ message, onShowTrace }: MessageItemProps) {
  if (message.role === "user") {
    const text = message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl bg-accent px-4 py-2 text-accent-foreground">{text}</p>
      </div>
    );
  }
  return (
    <article className="flex flex-col gap-3" aria-label="Respuesta del copiloto">
      {message.parts.map((part, index) => (
        <PartView key={`${message.id}-${index}`} part={part} />
      ))}
      <SourceChips ids={citedSourcesOf(message)} />
      <button
        type="button"
        onClick={() => onShowTrace(message.id)}
        className="self-start text-xs text-muted underline-offset-2 hover:underline"
      >
        Ver traza de esta respuesta
      </button>
    </article>
  );
}
