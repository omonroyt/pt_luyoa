/**
 * ES: Lectura del resultado de una herramienta del MCP tal como llega a la interfaz: un
 *     CallToolResult con el JSON en su primer contenido de texto. De ahí salen la fuente
 *     (chip) y el error (aviso de una línea, 07 §3.6).
 * EN: Reading of an MCP tool result as it reaches the UI: a CallToolResult with the JSON in
 *     its first text content. The source (chip) and the error (one-line notice, 07 §3.6)
 *     come from there.
 */
import { Source, ToolError } from "@alborada/shared";

type CallToolOutput = { isError?: boolean; content?: Array<{ type?: string; text?: string }> };

function resultJsonOf(output: unknown): unknown {
  const text = (output as CallToolOutput | null)?.content?.find(
    (part) => part.type === "text",
  )?.text;
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export function sourceOf(output: unknown): Source | undefined {
  const parsed = Source.safeParse(
    (resultJsonOf(output) as { source?: unknown } | undefined)?.source,
  );
  return parsed.success ? parsed.data : undefined;
}

// ES: Devuelve el mensaje del error en lenguaje de negocio; el código y la sugerencia
//     son para el agente, que decide si reintenta.
// EN: Returns the error message in business language; the code and suggestion are for
//     the agent, which decides whether to retry.
export function toolFailureOf(output: unknown): string | undefined {
  if (!(output as CallToolOutput | null)?.isError) return undefined;
  const parsed = ToolError.safeParse(resultJsonOf(output));
  return parsed.success ? parsed.data.error.message : "La consulta falló.";
}
