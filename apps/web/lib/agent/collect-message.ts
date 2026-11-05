/**
 * ES: Lee completa una respuesta del agente en el servidor, sin interfaz: convierte el
 *     stream de eventos en el mensaje del asistente y junta los errores del stream. Lo usa
 *     el resumen semanal del cron.
 * EN: Reads a full agent response on the server, without a UI: it turns the event stream
 *     into the assistant message and collects the stream errors. The cron weekly summary
 *     uses it.
 */
import {
  parseJsonEventStream,
  readUIMessageStream,
  uiMessageChunkSchema,
  type UIMessage,
  type UIMessageChunk,
} from "ai";

type Parsed = { success: true; value: UIMessageChunk } | { success: false; error: unknown };

export async function collectAgentMessage(
  response: Response,
): Promise<{ message: UIMessage | undefined; errors: string[] }> {
  if (!response.body) return { message: undefined, errors: ["Respuesta sin cuerpo."] };
  const errors: string[] = [];
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
        if (result.value.type === "error") errors.push(result.value.errorText);
        controller.enqueue(result.value);
      },
    }),
  );
  let message: UIMessage | undefined;
  const snapshots = readUIMessageStream({
    stream: chunks,
    onError: (error) => errors.push(error instanceof Error ? error.message : String(error)),
  });
  for await (const snapshot of snapshots) message = snapshot;
  return { message, errors };
}
