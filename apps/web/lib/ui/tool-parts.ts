/**
 * ES: Lectura uniforme de las partes de herramienta de un mensaje. Las herramientas del MCP
 *     llegan como "dynamic-tool" con su toolName y las del agente (presentación y
 *     aprobación) como "tool-<nombre>"; la interfaz las trata igual.
 * EN: Uniform reading of a message's tool parts. MCP tools arrive as "dynamic-tool" with
 *     their toolName and the agent's own tools (presentation and approval) as
 *     "tool-<name>"; the UI treats them the same way.
 */
import type { UIMessage } from "ai";

export type ToolView = {
  callId: string;
  name: string;
  state: string;
  input: unknown;
  output: unknown;
  errorText: string | undefined;
};

type AnyToolPart = {
  type: string;
  toolName?: string;
  toolCallId: string;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

function toolNameOf(tool: AnyToolPart): string | undefined {
  if (tool.type === "dynamic-tool") return tool.toolName;
  if (tool.type.startsWith("tool-")) return tool.type.slice("tool-".length);
  return undefined;
}

export function toolViewOf(part: UIMessage["parts"][number]): ToolView | null {
  const tool = part as AnyToolPart;
  const name = toolNameOf(tool);
  if (!name || typeof tool.toolCallId !== "string") return null;
  return {
    callId: tool.toolCallId,
    name,
    state: tool.state,
    input: tool.input,
    output: tool.output,
    errorText: tool.errorText,
  };
}

export type StepStatus = "running" | "done" | "error";

export function stepStatus(state: string): StepStatus {
  if (state === "output-available") return "done";
  if (state === "output-error" || state === "output-denied") return "error";
  return "running";
}

// ES: Nombre amable de cada consulta, para el aviso "paso en curso" (07 §3.6).
// EN: Friendly name of each query, for the "step in progress" notice (07 §3.6).
const TOOL_LABELS: Record<string, string> = {
  get_business_context: "Revisando el contexto del negocio",
  compare_periods: "Comparando periodos",
  sales_breakdown: "Revisando las ventas",
  visits_breakdown: "Revisando las visitas",
  location_health: "Revisando las sucursales",
  customer_segments: "Revisando los segmentos de clientes",
  audience_reach: "Calculando el alcance real",
  campaign_performance: "Revisando campañas pasadas",
  offer_economics: "Calculando el costo de la oferta",
  estimate_campaign_impact: "Estimando el impacto",
  lookup: "Buscando el detalle",
  create_campaign_draft: "Creando el borrador",
  send_campaign: "Enviando la campaña",
};

export function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? `Consultando ${name}`;
}
