/**
 * ES: Preguntas sugeridas (los seis escenarios y el caso de ejemplo). En celular van en una
 *     sola fila que se desplaza dentro de su contenedor, para no ocupar media pantalla.
 * EN: Suggested questions (the six scenarios and the example case). On mobile they sit in
 *     a single row that scrolls inside its container, so they do not take half the screen.
 */
import { SUGGESTIONS } from "@/lib/ui/suggestions";

export function SuggestionList({
  onPick,
  disabled,
}: {
  onPick: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <ul
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      aria-label="Preguntas sugeridas"
    >
      {SUGGESTIONS.map((suggestion) => (
        <li key={suggestion.id} className="shrink-0">
          <button
            type="button"
            disabled={disabled}
            title={suggestion.prompt}
            onClick={() => onPick(suggestion.prompt)}
            className="whitespace-nowrap rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-accent disabled:opacity-50"
          >
            {suggestion.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
