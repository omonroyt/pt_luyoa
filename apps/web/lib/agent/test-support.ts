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
    },
  ];
}

/**
 * ES: El guion decide la respuesta de cada llamada a partir de las herramientas activas.
 * EN: The script decides each call's reply from the active tools.
 */
export function scriptedModel(script: (hasTools: boolean, call: number) => ScriptedReply) {
  let call = 0;
  return new MockLanguageModelV4({
    doStream: async (options) => {
      const reply = script((options.tools?.length ?? 0) > 0, call);
      call += 1;
      return { stream: simulateReadableStream({ chunks: replyChunks(reply, call) }) };
    },
  });
}
