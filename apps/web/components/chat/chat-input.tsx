"use client";

/**
 * ES: Entrada del chat. Enter envía y Mayús+Enter agrega una línea; mientras el copiloto
 *     responde, el botón cambia a "Detener". Mientras hay una aprobación pendiente, la
 *     entrada se bloquea porque la decisión se toma con los botones del panel.
 * EN: Chat input. Enter sends and Shift+Enter adds a line; while the copilot answers, the
 *     button becomes "Detener". While an approval is pending, the input is locked because
 *     the decision is made with the panel buttons.
 */
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/icon";

type ChatInputProps = {
  busy: boolean;
  locked: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
};

const actionClass =
  "grid size-11 shrink-0 place-items-center rounded-2xl transition disabled:pointer-events-none disabled:opacity-40";

type InputActionProps = { busy: boolean; canSend: boolean; onStop: () => void };

function InputAction({ busy, canSend, onStop }: InputActionProps) {
  if (busy) {
    return (
      <button
        type="button"
        onClick={onStop}
        aria-label="Detener"
        title="Detener"
        className={`${actionClass} border border-border bg-surface text-foreground hover:border-accent/60`}
      >
        <Icon name="stop" className="size-4 fill-current" />
      </button>
    );
  }
  return (
    <button
      type="submit"
      disabled={!canSend}
      aria-label="Enviar"
      title="Enviar"
      className={`${actionClass} bg-accent text-accent-foreground shadow-soft hover:bg-accent-strong`}
    >
      <Icon name="send" className="size-5" />
    </button>
  );
}

export function ChatInput({ busy, locked, onSend, onStop }: ChatInputProps) {
  const [text, setText] = useState("");
  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const value = text.trim();
    if (!value || busy || locked) return;
    onSend(value);
    setText("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) submit(event);
  };
  return (
    <div className="flex flex-col gap-2">
      <form
        onSubmit={submit}
        className="flex items-end gap-2 rounded-3xl border border-border bg-card p-2 pl-4 shadow-lift transition focus-within:border-accent/60 focus-within:ring-4 focus-within:ring-accent/10"
      >
        <label htmlFor="chat-input" className="sr-only">
          Escribe tu pregunta
        </label>
        <textarea
          id="chat-input"
          rows={1}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={locked}
          placeholder={
            locked ? "Responde la aprobación con sus botones" : "Pregúntame sobre tu negocio…"
          }
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent py-2.5 outline-none [field-sizing:content] placeholder:text-muted/80 disabled:cursor-not-allowed"
        />
        <InputAction busy={busy} canSend={!locked && Boolean(text.trim())} onStop={onStop} />
      </form>
      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted">
        <Icon name="shield" className="size-3.5" />
        Cifras con fuente · nada se envía sin tu aprobación
      </p>
    </div>
  );
}
