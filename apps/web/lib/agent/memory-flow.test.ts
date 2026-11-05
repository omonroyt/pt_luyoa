import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { createMemoryPreferenceStore } from "../memory/preference-store";
import { MEMORY_TOOLS } from "./memory-tools";
import { streamAgentTurn } from "./run-turn";
import { fixtureMcpConnection, scriptedModel, type ScriptedReply } from "./test-support";

type DoStreamCall = {
  prompt: Array<{ role: string; content: unknown }>;
  tools?: Array<{ name: string }>;
};

const systemText = (call: DoStreamCall | undefined) =>
  (call?.prompt ?? [])
    .filter((message) => message.role === "system")
    .map((message) => String(message.content))
    .join("\n");

const ask = (text: string): UIMessage[] => [
  { id: "u1", role: "user", parts: [{ type: "text", text }] },
];

async function runTurn(
  messages: UIMessage[],
  script: ScriptedReply[],
  memory = createMemoryPreferenceStore(),
) {
  const model = scriptedModel((_hasTools, call) => script[call] ?? { text: "Listo." });
  const body = await (
    await streamAgentTurn(messages, { model, mcp: fixtureMcpConnection(), memory })
  ).text();
  return { body, calls: model.doStreamCalls as unknown as DoStreamCall[], memory };
}

const remember = (key: string, value: string): ScriptedReply => ({
  toolName: "remember_preference",
  input: { key, value },
});

describe("memoria de preferencias (X-04)", () => {
  it("con almacén, el turno ofrece las herramientas de memoria y su sección del prompt", async () => {
    const { calls } = await runTurn(ask("Hola"), []);
    const names = calls[0]?.tools?.map((tool) => tool.name) ?? [];
    expect(names).toEqual(expect.arrayContaining([...MEMORY_TOOLS]));
    expect(systemText(calls[0])).toContain("PREFERENCIAS DEL NEGOCIO");
    expect(systemText(calls[0])).toContain("(sin preferencias guardadas)");
  });

  it("lo que se guarda en una conversación aparece en el prompt de otra (CA-X04)", async () => {
    const first = await runTurn(ask("Recuerda que prefiero WhatsApp"), [
      remember("preferred_channel", "whatsapp"),
    ]);
    expect((await first.memory.list()).map(({ key, value }) => ({ key, value }))).toEqual([
      { key: "preferred_channel", value: "whatsapp" },
    ]);
    const second = await runTurn(ask("Propón una campaña"), [], first.memory);
    expect(systemText(second.calls[0])).toContain('Canal preferido: "whatsapp"');
  });

  it("un valor inválido para su clave no se guarda y el modelo recibe el motivo", async () => {
    const { calls, memory } = await runTurn(ask("Nunca más de 150% de descuento"), [
      remember("max_discount_pct", "150"),
    ]);
    expect(await memory.list()).toEqual([]);
    expect(JSON.stringify(calls[1]?.prompt)).toContain("Debe estar entre 1 y 100");
  });

  it("si el almacén falla al leer, el turno responde igual y el prompt lo advierte", async () => {
    const broken = {
      ...createMemoryPreferenceStore(),
      list: async () => Promise.reject(new Error("sin base de datos")),
    };
    const { body, calls } = await runTurn(ask("Hola"), [], broken);
    expect(systemText(calls[0])).toContain("no se pudieron leer las preferencias");
    expect(body).toContain("Listo.");
  });

  it("forget_preference borra la preferencia del almacén", async () => {
    const memory = createMemoryPreferenceStore();
    await memory.save("message_tone", "formal");
    const { calls } = await runTurn(
      ask("Olvida el tono"),
      [{ toolName: "forget_preference", input: { key: "message_tone" } }],
      memory,
    );
    expect(systemText(calls[0])).toContain('Tono de los mensajes: "formal"');
    expect(await memory.list()).toEqual([]);
  });
});
