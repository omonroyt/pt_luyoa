/**
 * ES: Lee la respuesta de /api/chat igual que la interfaz: el stream de eventos se
 *     convierte en chunks del protocolo de mensajes y se arma el mensaje del asistente.
 *     Mide el tiempo al primer texto y registra los errores del stream (M-07).
 * EN: Reads the /api/chat response the same way the UI does: the event stream becomes
 *     message protocol chunks and the assistant message is assembled. It measures time to
 *     first text and records stream errors (M-07).
 */
import {
  parseJsonEventStream,
  readUIMessageStream,
  uiMessageChunkSchema,
  type UIMessage,
  type UIMessageChunk,
} from "ai";

export type StreamRead = {
  message: UIMessage | undefined;
  firstTextMs: number | null;
  totalMs: number;
  errors: string[];
};

type Parsed = { success: true; value: UIMessageChunk } | { success: false; error: unknown };

export async function readAgentResponse(
  response: Response,
  previous: UIMessage | undefined,
  startedAt: number,
  clock: () => number = () => performance.now(),
): Promise<StreamRead> {
  if (!response.body) throw new Error(`Respuesta sin cuerpo (estado ${response.status}).`);
  const errors: string[] = [];
  let firstTextMs: number | null = null;
  const chunks = parseJsonEventStream({
    stream: response.body,
    schema: uiMessageChunkSchema,
  }).pipeThrough(
    new TransformStream<Parsed, UIMessageChunk>({
      transform(result, controller) {
        if (!result.success) {
          errors.push("Chunk del stream con formato inválido.");
          return;
        }
        const chunk = result.value;
        if (chunk.type === "text-delta" && firstTextMs === null) firstTextMs = clock() - startedAt;
        if (chunk.type === "error") errors.push(chunk.errorText);
        controller.enqueue(chunk);
      },
    }),
  );
  let message: UIMessage | undefined;
  const snapshots = readUIMessageStream({
    message: previous,
    stream: chunks,
    onError: (error) => errors.push(error instanceof Error ? error.message : String(error)),
  });
  for await (const snapshot of snapshots) message = snapshot;
  return { message, firstTextMs, totalMs: clock() - startedAt, errors };
}
