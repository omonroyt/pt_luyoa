/**
 * ES: Orquestador de un turno del agente (IMP-30, ADR-06). Conecta el cliente MCP, carga
 *     el contexto del negocio, arma el prompt y corre el bucle de herramientas con
 *     streamText, con un tope de pasos por turno (06_DISENO_AGENTE §6). Devuelve la
 *     respuesta en el protocolo de mensajes de interfaz del AI SDK.
 * EN: Agent turn orchestrator (IMP-30, ADR-06). It connects the MCP client, loads the
 *     business context, builds the prompt and runs the tool loop with streamText, capped
 *     at a number of steps per turn (06_DISENO_AGENTE §6). It returns the response in the
 *     AI SDK UI message protocol.
 */
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type LanguageModel,
  type ToolSet,
  type UIMessage,
} from "ai";
import { loadBusinessContext } from "./business-context";
import { connectMcpClient, type McpConnection } from "./mcp-tools";
import { createPresentationTools } from "./presentation-tools";
import { createSourceRegistry, seedFromMessages, trackSources } from "./source-registry";
import { buildSystemPrompt, type AgentCapabilities } from "./system-prompt";
import { uiErrorMessage } from "./ui-errors";

export const MAX_STEPS = 12;

// ES: Las escrituras se habilitan junto con las herramientas de aprobación (IMP-34).
//     Aun expuestas, el MCP las rechazaría sin un token firmado (ADR-08).
// EN: Writes are enabled together with the approval tools (IMP-34). Even if exposed, the
//     MCP would reject them without a signed token (ADR-08).
const WRITE_TOOLS = new Set(["create_campaign_draft", "send_campaign"]);

const CAPABILITIES: AgentCapabilities = { presentation: true, approvals: false, memory: false };

export const STEP_LIMIT_NOTE = [
  "LÍMITE DE PASOS",
  "Llegaste al máximo de consultas de este turno. Responde ya con lo que obtuviste,",
  "sin llamar herramientas, y di con claridad qué no alcanzaste a revisar.",
].join("\n");

export type TurnDependencies = {
  model: LanguageModel;
  mcp: McpConnection;
};

export function readOnlyTools(tools: ToolSet): ToolSet {
  return Object.fromEntries(Object.entries(tools).filter(([name]) => !WRITE_TOOLS.has(name)));
}

/**
 * ES: En el último paso permitido se retiran las herramientas y se pide cerrar con lo
 *     obtenido, para que el turno nunca termine en una llamada sin respuesta.
 * EN: On the last allowed step the tools are removed and the model is asked to close
 *     with what it has, so a turn never ends on a call without an answer.
 */
export function finalStepPolicy(instructions: string) {
  return ({ stepNumber }: { stepNumber: number }) =>
    stepNumber === MAX_STEPS - 1
      ? { activeTools: [], instructions: `${instructions}\n\n${STEP_LIMIT_NOTE}` }
      : undefined;
}

export async function streamAgentTurn(
  messages: UIMessage[],
  dependencies: TurnDependencies,
): Promise<Response> {
  const client = await connectMcpClient(dependencies.mcp);
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    await client.close();
  };
  try {
    const registry = createSourceRegistry();
    seedFromMessages(registry, messages);
    const businessTools = trackSources(readOnlyTools(await client.tools()), registry);
    const context = await loadBusinessContext(businessTools);
    const tools = { ...businessTools, ...createPresentationTools(registry) };
    const instructions = buildSystemPrompt({ context, capabilities: CAPABILITIES });
    const result = streamText({
      model: dependencies.model,
      instructions,
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: isStepCount(MAX_STEPS),
      prepareStep: finalStepPolicy(instructions),
      onEnd: close,
      onAbort: close,
      onError: close,
    });
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream, onError: uiErrorMessage }),
    });
  } catch (error) {
    await close();
    throw error;
  }
}
