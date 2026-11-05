"use client";

/**
 * ES: Formulario del código de acceso. Envía el código a /api/access; si es válido, el
 *     servidor deja la cookie de sesión y la página pasa al chat. Los errores del servidor
 *     se muestran tal cual (código incorrecto o demasiados intentos).
 * EN: Access code form. It sends the code to /api/access; if valid, the server sets the
 *     session cookie and the page moves to the chat. Server errors are shown as they come
 *     (wrong code or too many attempts).
 */
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";

async function submitCode(code: string): Promise<string | null> {
  const response = await fetch("/api/access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (response.ok) return null;
  const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
  return body?.error?.message ?? "No se pudo validar el código. Intenta de nuevo.";
}

export function AccessForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim() || working) return;
    setWorking(true);
    const failure = await submitCode(code).catch(() => "Sin conexión. Intenta de nuevo.");
    if (failure === null) return router.replace("/");
    setError(failure);
    setWorking(false);
  };
  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="flex animate-rise flex-col gap-3 rounded-3xl border border-border bg-card p-5 shadow-lift"
    >
      <label htmlFor="access-code" className="text-sm font-medium">
        Código de acceso
      </label>
      <input
        id="access-code"
        type="password"
        autoComplete="off"
        autoFocus
        value={code}
        onChange={(event) => setCode(event.target.value)}
        className="h-12 rounded-xl border border-border bg-background px-4 outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
      />
      {error ? (
        <p role="alert" className="flex items-center gap-2 text-sm text-negative">
          <Icon name="alert" className="size-4 shrink-0" />
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={working || !code.trim()}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-foreground transition hover:bg-accent-strong disabled:opacity-50"
      >
        {working ? "Entrando…" : "Entrar"}
        <Icon name="arrowRight" className="size-4" />
      </button>
    </form>
  );
}
