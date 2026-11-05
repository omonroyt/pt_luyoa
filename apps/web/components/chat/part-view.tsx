/**
 * ES: Dibuja una parte de un mensaje: texto, aviso de consulta del MCP o bloque visual. Un
 *     bloque de presentación se dibuja solo cuando su llamada terminó bien (el verificador
 *     de cifras lo aprobó); mientras tanto se muestra un marcador. Si el verificador lo
 *     rechaza, se muestra que el agente lo está corrigiendo.
 * EN: Draws a message part: text, MCP query notice or visual block. A presentation block
 *     is drawn only once its call ended well (the figure verifier approved it); until then
 *     a placeholder is shown. If the verifier rejects it, the UI shows the agent is fixing it.
 */
import type { UIMessage } from "ai";
import { BlockView, hasBlockView } from "@/components/blocks/block-view";
import { PendingBlock } from "@/components/blocks/pending-block";
import { stepStatus, toolLabel, toolViewOf, type ToolView } from "@/lib/ui/tool-parts";
import { toolFailureOf } from "@/lib/ui/tool-result";
import { MarkdownText } from "./markdown-text";
import { ToolStep } from "./tool-step";

// ES: Bloques que aún no tienen componente (tarjeta de campaña y aprobaciones, IMP-42).
// EN: Blocks that do not have a component yet (campaign card and approvals, IMP-42).
const PENDING_TOOLS = new Set([
  "show_campaign_card",
  "request_draft_approval",
  "request_send_approval",
]);

function PresentationPart({ tool }: { tool: ToolView }) {
  if (tool.state === "output-error") {
    return <ToolStep label={tool.errorText ?? "Bloque en corrección"} status="error" />;
  }
  if (tool.state !== "output-available" || !hasBlockView(tool.name)) {
    return <PendingBlock label="Preparando el visual" />;
  }
  return <BlockView name={tool.name} input={tool.input} />;
}

function McpPart({ tool }: { tool: ToolView }) {
  const failure = toolFailureOf(tool.output);
  if (failure) return <ToolStep label={`${toolLabel(tool.name)}: ${failure}`} status="error" />;
  return <ToolStep label={toolLabel(tool.name)} status={stepStatus(tool.state)} />;
}

function ToolPart({ tool }: { tool: ToolView }) {
  // ES: Las fuentes citadas se muestran al final del mensaje (MessageItem).
  // EN: Cited sources are shown at the end of the message (MessageItem).
  if (tool.name === "cite_sources") return null;
  if (hasBlockView(tool.name) || PENDING_TOOLS.has(tool.name)) {
    return <PresentationPart tool={tool} />;
  }
  return <McpPart tool={tool} />;
}

export function PartView({ part }: { part: UIMessage["parts"][number] }) {
  if (part.type === "text") return <MarkdownText text={part.text} />;
  const tool = toolViewOf(part);
  return tool ? <ToolPart tool={tool} /> : null;
}
