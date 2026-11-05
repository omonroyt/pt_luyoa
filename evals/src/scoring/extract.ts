/**
 * ES: Lo que se califica de una transcripción: el texto del asistente, los bloques que la
 *     interfaz mostraría (solo los que pasaron el verificador), las herramientas usadas
 *     según la traza y los resultados del MCP de la conversación.
 * EN: What is scored from a transcript: the assistant text, the blocks the UI would show
 *     (only those that passed the verifier), the tools used according to the trace and
 *     the conversation's MCP results.
 */
import type { TraceStep } from "@alborada/web/agent";
import type { UIMessage } from "ai";
import type { BlockKind } from "../cases/case-schema";
import type { CaseTranscript } from "../runner/run-case";

const BLOCK_TOOLS: Record<string, BlockKind> = {
  show_chart: "chart",
  show_table: "table",
  show_kpis: "kpis",
  show_campaign_card: "campaign_card",
};

export type ShownBlock = { kind: BlockKind; input: unknown };

type PartLike = {
  type: string;
  text?: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
};

const partsOf = (messages: UIMessage[], role: UIMessage["role"]) =>
  messages
    .filter((message) => message.role === role)
    .flatMap((message) => message.parts as PartLike[]);

export type Extracted = {
  text: string;
  userText: string;
  blocks: ShownBlock[];
  steps: TraceStep[];
  toolsUsed: string[];
  mcpOutputs: unknown[];
};

function mcpPayload(output: unknown): unknown {
  const content = (output as { content?: Array<{ type?: string; text?: string }> } | null)?.content;
  const text = content?.find((part) => part.type === "text")?.text;
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function extract(transcript: CaseTranscript): Extracted {
  const assistant = partsOf(transcript.messages, "assistant");
  const textOf = (parts: PartLike[]) =>
    parts.flatMap((part) => (part.type === "text" && part.text ? [part.text] : [])).join("\n");
  const blocks = assistant.flatMap((part) => {
    const kind = BLOCK_TOOLS[part.type.slice("tool-".length)];
    return kind && part.state === "output-available" ? [{ kind, input: part.input }] : [];
  });
  const steps = transcript.requests.flatMap((request) => request.steps);
  return {
    text: textOf(assistant),
    userText: textOf(partsOf(transcript.messages, "user")),
    blocks,
    steps,
    toolsUsed: [...new Set(steps.filter((step) => step.kind === "tool").map((step) => step.name))],
    mcpOutputs: assistant
      .filter((part) => part.type === "dynamic-tool" && part.state === "output-available")
      .map((part) => mcpPayload(part.output)),
  };
}
