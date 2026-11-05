/**
 * ES: Preguntas sugeridas (los seis escenarios, el resumen y el caso de ejemplo). Con el
 *     chat vacío van en una cuadrícula de tarjetas con ícono y la pregunta completa; ya en
 *     la conversación, en una franja de una sola fila que se desplaza a los lados dentro
 *     de su contenedor, sin ocupar media pantalla.
 * EN: Suggested questions (the six scenarios, the summary and the example case). With an
 *     empty chat they sit in a grid of cards with an icon and the full question; once the
 *     conversation starts, in a single-row strip that scrolls sideways inside its
 *     container, without taking half the screen.
 */
import { Icon } from "@/components/ui/icon";
import { SUGGESTIONS, type Suggestion } from "@/lib/ui/suggestions";

type SuggestionListProps = {
  onPick: (prompt: string) => void;
  disabled: boolean;
  variant: "grid" | "strip";
};

type ItemProps = { suggestion: Suggestion; onPick: (prompt: string) => void; disabled: boolean };

function SuggestionCard({ suggestion, onPick, disabled }: ItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(suggestion.prompt)}
      className="group relative flex h-full w-full flex-col gap-2 overflow-hidden rounded-2xl border border-border bg-card p-3 text-left transition duration-300 after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-300 hover:-translate-y-1 hover:border-foreground/15 hover:shadow-lift hover:after:scale-x-100 disabled:pointer-events-none disabled:opacity-50 sm:p-4"
    >
      <span className="flex items-center justify-between">
        <Icon
          name={suggestion.icon}
          className="size-5 text-accent transition-transform duration-300 group-hover:scale-110"
        />
        <Icon
          name="arrowRight"
          className="size-4 -translate-x-2 text-accent opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100"
        />
      </span>
      <span className="text-sm font-semibold transition-colors group-hover:text-accent">
        {suggestion.label}
      </span>
      <span className="line-clamp-2 hidden text-xs leading-relaxed text-muted sm:block">
        {suggestion.prompt}
      </span>
    </button>
  );
}

function SuggestionChip({ suggestion, onPick, disabled }: ItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={suggestion.prompt}
      onClick={() => onPick(suggestion.prompt)}
      className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card/80 px-3 text-sm text-muted transition hover:border-accent/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
    >
      <Icon name={suggestion.icon} className="size-3.5 text-accent" />
      {suggestion.label}
    </button>
  );
}

export function SuggestionList({ onPick, disabled, variant }: SuggestionListProps) {
  if (variant === "grid") {
    return (
      <ul
        className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4"
        aria-label="Preguntas sugeridas"
      >
        {SUGGESTIONS.map((suggestion, index) => (
          <li
            key={suggestion.id}
            className="animate-rise"
            style={{ animationDelay: `${120 + index * 45}ms` }}
          >
            <SuggestionCard suggestion={suggestion} onPick={onPick} disabled={disabled} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(90deg,transparent,#000_16px,#000_calc(100%-16px),transparent)] [scrollbar-width:none]"
      aria-label="Preguntas sugeridas"
    >
      {SUGGESTIONS.map((suggestion) => (
        <li key={suggestion.id} className="shrink-0">
          <SuggestionChip suggestion={suggestion} onPick={onPick} disabled={disabled} />
        </li>
      ))}
    </ul>
  );
}
