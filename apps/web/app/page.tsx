export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold">☕ Copiloto Café Alborada</h1>
      <p className="opacity-80">
        Base del proyecto. El chat, el agente y las respuestas visuales están en construcción.
      </p>
      <p className="text-sm opacity-60">
        Estado de la configuración: <code>/api/health</code>.
      </p>
    </main>
  );
}
