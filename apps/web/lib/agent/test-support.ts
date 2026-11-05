/**
 * ES: Utilidades de prueba del agente: conexión MCP sobre fixtures y un modelo simulado
 *     del AI SDK que responde con llamadas a herramientas o texto según un guion.
 * EN: Agent test utilities: MCP connection backed by fixtures and an AI SDK mock model
 *     that answers with tool calls or text following a script.
 */
import { createFixtureServerFactory } from "@alborada/mcp-server/testing";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { connectMcpClient, type McpConnection } from "./mcp-tools";
import { payloadFromMcpResult } from "./source-registry";

export const TEST_SERVICE_TOKEN = "t".repeat(40);

export function fixtureMcpConnection(): McpConnection {
  return { serviceToken: TEST_SERVICE_TOKEN, createServer: createFixtureServerFactory() };
}

/**
 * ES: source.id que el MCP asigna a una consulta con las fixtures, para no fijarlo a mano.
 * EN: source.id the MCP assigns to a query with the fixtures, so it is not hardcoded.
 */
export async function sourceIdOf(toolName: string, input: object): Promise<string> {
  const client = await connectMcpClient(fixtureMcpConnection());
  try {
    const execute = (await client.tools())[toolName]?.execute;
    const result: unknown = await execute?.(input, { toolCallId: "id", messages: [], context: {} });
    const id = payloadFromMcpResult(result)?.source.id;
    if (!id) throw new Error(`${toolName} no devolvió una fuente`);
    return id;
  } finally {
    await client.close();
  }
}

const USAGE = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};

// ES: Costo por llamada que reporta OpenRouter en providerMetadata.
// EN: Per-call cost that OpenRouter reports in providerMetadata.
export const TEST_CALL_COST = 0.001;
const PROVIDER_METADATA = { openrouter: { usage: { cost: TEST_CALL_COST } } };

export type ScriptedReply = { toolName: string; input: object } | { text: string };

// ES: Tipo de las partes del stream del modelo, derivado del modelo simulado del AI SDK.
// EN: Type of the model stream parts, derived from the AI SDK mock model.
type DoStream = NonNullable<ConstructorParameters<typeof MockLanguageModelV4>[0]>["doStream"];
type StreamPart =
  Awaited<ReturnType<Extract<DoStream, (...args: never[]) => unknown>>> extends {
    stream: ReadableStream<infer Part>;
  }
    ? Part
    : never;

function replyChunks(reply: ScriptedReply, index: number): StreamPart[] {
  if ("text" in reply) {
    return [
      { type: "text-start" as const, id: `t${index}` },
      { type: "text-delta" as const, id: `t${index}`, delta: reply.text },
      { type: "text-end" as const, id: `t${index}` },
      {
        type: "finish" as const,
        finishReason: { unified: "stop" as const, raw: undefined },
        usage: USAGE,
        providerMetadata: PROVIDER_METADATA,
      },
    ];
  }
  return [
    {
      type: "tool-call" as const,
      toolCallId: `call_${index}`,
      toolName: reply.toolName,
      input: JSON.stringify(reply.input),
    },
    {
      type: "finish" as const,
      finishReason: { unified: "tool-calls" as const, raw: undefined },
      usage: USAGE,
      providerMetadata: PROVIDER_METADATA,
    },
  ];
}

/**
 * ES: El guion decide la respuesta de cada llamada a partir de las herramientas activas y,
 *     si lo necesita, del prompt (por ejemplo, para leer un token de aprobación).
 * EN: The script decides each call's reply from the active tools and, if needed, from the
 *     prompt (for example, to read an approval token).
 */
export function scriptedModel(
  script: (hasTools: boolean, call: number, prompt: unknown) => ScriptedReply,
) {
  let call = 0;
  return new MockLanguageModelV4({
    doStream: async (options) => {
      const reply = script((options.tools?.length ?? 0) > 0, call, options.prompt);
      call += 1;
      return { stream: simulateReadableStream({ chunks: replyChunks(reply, call) }) };
    },
  });
}

// ES: Tarjeta válida y pasos para mostrarla (ver test-card.ts).
// EN: Valid card and steps to show it (see test-card.ts).
export { cardSteps, fixtureCampaignCard, type TestCard } from "./test-card";
