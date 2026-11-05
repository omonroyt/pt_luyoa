"use client";

/**
 * ES: Entrada del chat. Enter envía y Mayús+Enter agrega una línea; mientras el copiloto
 *     responde, el botón cambia a "Detener".
 * EN: Chat input. Enter sends and Shift+Enter adds a line; while the copilot answers, the
 *     button becomes "Detener".
 */
import { useState, type FormEvent, type KeyboardEvent } from "react";

type ChatInputProps = {
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
};

export function ChatInput({ busy, onSend, onStop }: ChatInputProps) {
  const [text, setText] = useState("");
  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    onSend(value);
    setText("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) submit(event);
  };
  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <label htmlFor="chat-input" className="sr-only">
        Escribe tu pregunta
      </label>
      <textarea
        id="chat-input"
        rows={1}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Pregúntame sobre tu negocio…"
        className="max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2.5 outline-none focus:border-accent"
      />
      {busy ? (
        <button
          type="button"
          onClick={onStop}
          className="h-11 rounded-xl border border-border px-4"
        >
          Detener
        </button>
      ) : (
        <button type="submit" className="h-11 rounded-xl bg-accent px-4 text-accent-foreground">
          Enviar
        </button>
      )}
    </form>
  );
}
