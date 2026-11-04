export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold">☕ Copiloto Café Alborada</h1>
      <p className="opacity-80">
        Base del proyecto lista. El chat, el agente y las respuestas visuales se construyen en las
        siguientes fases.
      </p>
      <p className="text-sm opacity-60">
        Revisa la configuración en <code>/api/health</code>.
      </p>
    </main>
  );
}
