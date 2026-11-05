/**
 * ES: Dibuja una parte de un mensaje: texto, aviso de consulta del MCP o bloque visual. Los
 *     bloques de presentación y aprobación tienen su propio componente; cite_sources no
 *     se dibuja aparte porque cada bloque muestra sus fuentes.
 * EN: Draws a message part: text, MCP query notice or visual block. Presentation and
 *     approval blocks have their own component; cite_sources is not drawn separately
 *     because every block shows its sources.
 */
import type { UIMessage } from "ai";
import { PendingBlock } from "@/components/blocks/pending-block";
import { stepStatus, toolLabel, toolViewOf, type ToolView } from "@/lib/ui/tool-parts";
import { MarkdownText } from "./markdown-text";
import { ToolStep } from "./tool-step";

const BLOCK_TOOLS = new Set([
  "show_chart",
  "show_table",
  "show_kpis",
  "show_campaign_card",
  "request_draft_approval",
  "request_send_approval",
]);

function ToolPart({ tool }: { tool: ToolView }) {
  if (tool.name === "cite_sources") return null;
  if (BLOCK_TOOLS.has(tool.name)) {
    if (tool.state === "output-error") {
      return <ToolStep label={tool.errorText ?? "Bloque en corrección"} status="error" />;
    }
    return <PendingBlock label={`Bloque ${tool.name}`} />;
  }
  return <ToolStep label={toolLabel(tool.name)} status={stepStatus(tool.state)} />;
}

export function PartView({ part }: { part: UIMessage["parts"][number] }) {
  if (part.type === "text") return <MarkdownText text={part.text} />;
  const tool = toolViewOf(part);
  return tool ? <ToolPart tool={tool} /> : null;
}
