/**
 * ES: Un mensaje del hilo. Los de la dueña van a la derecha en una burbuja oscura; los del
 *     copiloto llevan la taza de la marca a un lado y ocupan el ancho para dar espacio a
 *     gráficas y tablas. Cada mensaje entra con una animación suave.
 * EN: A thread message. The owner's sit on the right in a dark bubble; the copilot's carry
 *     the brand cup on one side and use the full width to leave room for charts and
 *     tables. Each message enters with a soft animation.
 */
import type { UIMessage } from "ai";
import { SourceChips } from "@/components/blocks/source-chips";
import { BrandMark } from "@/components/ui/brand-mark";
import { Icon } from "@/components/ui/icon";
import { citedSourcesOf } from "@/lib/ui/cited-sources";
import { PartView } from "./part-view";

type MessageItemProps = { message: UIMessage; onShowTrace: (messageId: string) => void };

export function MessageItem({ message, onShowTrace }: MessageItemProps) {
  if (message.role === "user") {
    const text = message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
    return (
      <div className="flex animate-rise justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-foreground px-4 py-2.5 text-background shadow-soft">
          {text}
        </p>
      </div>
    );
  }
  return (
    <div className="flex animate-rise gap-3">
      <BrandMark size={30} className="mt-0.5 hidden size-[30px] shrink-0 -rotate-6 sm:block" />
      <article className="flex min-w-0 flex-1 flex-col gap-3" aria-label="Respuesta del copiloto">
        {message.parts.map((part, index) => (
          <PartView key={`${message.id}-${index}`} part={part} />
        ))}
        <SourceChips ids={citedSourcesOf(message)} />
        <button
          type="button"
          onClick={() => onShowTrace(message.id)}
          className="inline-flex min-h-6 items-center gap-1.5 self-start py-1 text-xs text-muted transition hover:text-accent"
        >
          <Icon name="activity" className="size-3.5" />
          Ver traza de esta respuesta
        </button>
      </article>
    </div>
  );
}
