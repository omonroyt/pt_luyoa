/**
 * ES: Preguntas sugeridas (los seis escenarios y el caso de ejemplo).
 * EN: Suggested questions (the six scenarios and the example case).
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
    <ul className="flex flex-wrap gap-2" aria-label="Preguntas sugeridas">
      {SUGGESTIONS.map((suggestion) => (
        <li key={suggestion.id}>
          <button
            type="button"
            disabled={disabled}
            title={suggestion.prompt}
            onClick={() => onPick(suggestion.prompt)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-accent disabled:opacity-50"
          >
            {suggestion.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
