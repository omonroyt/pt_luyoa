"use client";

/**
 * ES: Formulario de "Cambiar": la persona escribe qué ajustar y el texto viaja al agente
 *     como motivo del rechazo; el agente recalcula y vuelve a pedir aprobación.
 * EN: "Cambiar" form: the person writes what to adjust and the text reaches the agent as
 *     the rejection reason; the agent recalculates and asks for approval again.
 */
import { useState, type FormEvent } from "react";

type ChangeRequestFormProps = {
  disabled: boolean;
  onCancel: () => void;
  onSubmit: (changes: string) => void;
};

export function ChangeRequestForm({ disabled, onCancel, onSubmit }: ChangeRequestFormProps) {
  const [changes, setChanges] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (changes.trim()) onSubmit(changes);
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor="change-request" className="text-sm">
        ¿Qué quieres cambiar?
      </label>
      <textarea
        id="change-request"
        rows={2}
        value={changes}
        onChange={(event) => setChanges(event.target.value)}
        placeholder="Por ejemplo: usa WhatsApp en lugar de push"
        className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-accent"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={disabled || !changes.trim()}
          className="h-11 rounded-xl bg-accent px-4 text-accent-foreground disabled:opacity-50"
        >
          Pedir cambios
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-11 rounded-xl border border-border px-4"
        >
          Volver
        </button>
      </div>
    </form>
  );
}
