import { describe, expect, it, vi } from "vitest";
import { fetchLatestSummary } from "./weekly-summary";

const reply = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

const messages = [
  { id: "u", role: "user", parts: [{ type: "text", text: "Dame el resumen de la semana." }] },
  {
    id: "a",
    role: "assistant",
    parts: [{ type: "text", text: "Semana del 25 al 31 de octubre." }],
  },
];

describe("resumen semanal en la interfaz", () => {
  it("devuelve el último resumen guardado con sus mensajes", async () => {
    const summary = {
      id: "s1",
      weekEnd: "2026-10-31",
      createdAt: "2026-11-02T13:00:00Z",
      messages,
    };
    expect(await fetchLatestSummary(reply(200, { summary }))).toEqual(summary);
  });

  it("devuelve null si todavía no hay resumen", async () => {
    expect(await fetchLatestSummary(reply(200, { summary: null }))).toBeNull();
  });

  it("rechaza un resumen sin respuesta del asistente o con otra forma", async () => {
    const partial = { id: "s1", weekEnd: "x", createdAt: "x", messages: messages.slice(0, 1) };
    await expect(fetchLatestSummary(reply(200, { summary: partial }))).rejects.toThrow();
    await expect(fetchLatestSummary(reply(500, {}))).rejects.toThrow();
  });
});
