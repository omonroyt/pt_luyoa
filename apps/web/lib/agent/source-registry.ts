/**
 * ES: Registro de las fuentes de una conversación (07 §6). Guarda cada resultado del MCP
 *     por su source.id junto con todas sus cifras, para que el verificador compruebe que
 *     un bloque solo cita fuentes de esta conversación y que sus números salen de ellas.
 *     Se alimenta con el historial (turnos anteriores) y con cada herramienta del turno.
 * EN: Conversation source registry (07 §6). It stores each MCP result by its source.id
 *     together with all its figures, so the verifier can check that a block only cites
 *     sources from this conversation and that its numbers come from them. It is fed with
 *     the history (previous turns) and with every tool call of the turn.
 */
import type { ToolSet, UIMessage } from "ai";

export type RegisteredSource = {
  id: string;
  tool: string;
  data: unknown;
  numbers: number[];
  order: number;
};

export type SourceRegistry = {
  register: (result: unknown) => void;
  get: (id: string) => RegisteredSource | undefined;
};

type ToolPayload = { data: unknown; source: { id: string; tool: string } };

function isPayload(value: unknown): value is ToolPayload {
  const source = (value as { source?: { id?: unknown; tool?: unknown } } | null)?.source;
  return typeof source?.id === "string" && typeof source.tool === "string";
}

/**
 * ES: Extrae el resultado JSON de una llamada MCP ({ content: [{ type: "text", text }] }).
 * EN: Extracts the JSON result of an MCP call ({ content: [{ type: "text", text }] }).
 */
export function payloadFromMcpResult(result: unknown): ToolPayload | undefined {
  const content = (result as { content?: Array<{ type?: string; text?: string }> } | null)?.content;
  const text = content?.find((part) => part.type === "text")?.text;
  if (!text) return undefined;
  try {
    const parsed: unknown = JSON.parse(text);
    return isPayload(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function collectNumbers(value: unknown, into: number[] = []): number[] {
  if (typeof value === "number" && Number.isFinite(value)) into.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectNumbers(item, into));
  else if (value !== null && typeof value === "object") {
    Object.values(value).forEach((item) => collectNumbers(item, into));
  }
  return into;
}

export function createSourceRegistry(): SourceRegistry {
  const sources = new Map<string, RegisteredSource>();
  let order = 0;
  return {
    register(result) {
      const payload = payloadFromMcpResult(result);
      if (!payload) return;
      order += 1;
      sources.set(payload.source.id, {
        id: payload.source.id,
        tool: payload.source.tool,
        data: payload.data,
        numbers: collectNumbers(payload.data),
        order,
      });
    },
    get: (id) => sources.get(id),
  };
}

/**
 * ES: Registra los resultados de herramientas que ya vienen en el historial de la interfaz.
 * EN: Registers the tool results already present in the UI history.
 */
export function seedFromMessages(registry: SourceRegistry, messages: UIMessage[]): void {
  for (const message of messages) {
    for (const part of message.parts) {
      if ("output" in part) registry.register(part.output);
    }
  }
}

/**
 * ES: Envuelve las herramientas del MCP para registrar cada resultado al ejecutarse.
 * EN: Wraps the MCP tools so every result is registered when executed.
 */
export function trackSources(tools: ToolSet, registry: SourceRegistry): ToolSet {
  return Object.fromEntries(
    Object.entries(tools).map(([name, original]) => {
      const execute = original.execute;
      if (!execute) return [name, original];
      const tracked: typeof execute = async (input, options) => {
        const result: unknown = await execute(input, options);
        registry.register(result);
        return result;
      };
      return [name, { ...original, execute: tracked }];
    }),
  );
}
