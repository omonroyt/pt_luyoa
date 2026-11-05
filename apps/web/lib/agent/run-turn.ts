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
  createIdGenerator,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type LanguageModel,
  type TextStreamPart,
  type ToolSet,
  type UIMessage,
} from "ai";
import type { MCPClient } from "@ai-sdk/mcp";
import { approvalStepPolicy, type StepLike } from "./approval-policy";
import { createApprovalTools } from "./approval-tools";
import { loadBusinessContext, type BusinessContext } from "./business-context";
import { createCardGate } from "./card-gate";
import { createMemoryTools } from "./memory-tools";
import type { PreferenceStore } from "../memory/preference-store";
import { preferenceLine } from "../memory/preferences";
import { connectMcpClient, type McpConnection } from "./mcp-tools";
import { createPresentationTools } from "./presentation-tools";
import {
  createSourceRegistry,
  seedFromMessages,
  trackSources,
  type SourceRegistry,
} from "./source-registry";
import { buildSystemPrompt, type AgentCapabilities } from "./system-prompt";
import { createTurnTracer, type TraceStep, type TurnTotals } from "./turn-tracer";
import { reportStreamError } from "./ui-errors";
import { withReason } from "./with-reason";

export const MAX_STEPS = 12;

// ES: Las escrituras del MCP (create_campaign_draft, send_campaign) están expuestas junto
//     con las herramientas de aprobación: el modelo solo obtiene el token si la persona
//     aprueba en la interfaz, y el MCP rechaza cualquier escritura sin él (ADR-08).
// EN: The MCP writes (create_campaign_draft, send_campaign) are exposed together with the
//     approval tools: the model only gets the token if the person approves in the UI, and
//     the MCP rejects any write without it (ADR-08).
const capabilitiesOf = (memory: PreferenceStore | undefined): AgentCapabilities => ({
  presentation: true,
  approvals: true,
  memory: memory !== undefined,
});

export const STEP_LIMIT_NOTE = [
  "LÍMITE DE PASOS",
  "Llegaste al máximo de consultas de este turno. Responde ya con lo que obtuviste,",
  "sin llamar herramientas, y di con claridad qué no alcanzaste a revisar.",
].join("\n");

export type PersistTurn = (turn: {
  messages: UIMessage[];
  steps: TraceStep[];
  totals: TurnTotals;
}) => Promise<void>;

export type TurnDependencies = {
  model: LanguageModel;
  mcp: McpConnection;
  // ES: Guarda la traza del turno; si falla, el chat sigue y el error se registra.
  // EN: Stores the turn trace; if it fails, the chat continues and the error is logged.
  persist?: PersistTurn;
  // ES: Preferencias del negocio (X-04). Sin almacén, el turno no tiene memoria.
  // EN: Business preferences (X-04). Without a store, the turn has no memory.
  memory?: PreferenceStore;
  // ES: Recibe el contexto del negocio del turno (lo usa el resumen semanal para su fecha).
  // EN: Receives the turn's business context (the weekly summary uses it for its date).
  onContext?: (context: BusinessContext) => void;
};

const modelName = (model: LanguageModel) => (typeof model === "string" ? model : model.modelId);

async function buildTools(client: MCPClient, registry: SourceRegistry, memory?: PreferenceStore) {
  const businessTools = trackSources(await client.tools(), registry);
  const context = await loadBusinessContext(businessTools);
  const gate = createCardGate();
  const tools = await withReason({
    ...businessTools,
    ...createPresentationTools(registry, gate),
    ...createApprovalTools(gate),
    ...(memory ? createMemoryTools(memory) : {}),
  });
  return { tools, context };
}

// ES: Si no se pueden leer las preferencias, el turno sigue sin ellas y lo dice el prompt.
// EN: If preferences cannot be read, the turn goes on without them and the prompt says so.
async function savedPreferences(memory?: PreferenceStore): Promise<string[] | undefined> {
  if (!memory) return undefined;
  try {
    return (await memory.list()).map(preferenceLine);
  } catch (error) {
    console.error(
      "No se pudieron leer las preferencias:",
      error instanceof Error ? error.message : "error desconocido",
    );
    return ["(no se pudieron leer las preferencias en este turno)"];
  }
}

async function persistSafely(persist: PersistTurn, turn: Parameters<PersistTurn>[0]) {
  try {
    await persist(turn);
  } catch (error) {
    console.error(
      "No se pudo guardar la traza del turno:",
      error instanceof Error ? error.message : "error desconocido",
    );
  }
}

/**
 * ES: Respuesta en el protocolo de la interfaz. El mensaje del asistente lleva un id y, al
 *     terminar, los totales del turno como metadatos (tokens, costo y latencia) para el
 *     panel de trazas; el turno completo se guarda con su traza.
 * EN: Response in the UI protocol. The assistant message carries an id and, when it ends,
 *     the turn totals as metadata (tokens, cost and latency) for the trace panel; the full
 *     turn is stored with its trace.
 */
function turnResponse(
  stream: ReadableStream<TextStreamPart<ToolSet>>,
  messages: UIMessage[],
  tracer: ReturnType<typeof createTurnTracer>,
  persist: PersistTurn | undefined,
) {
  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream,
      onError: (error) => reportStreamError(error),
      originalMessages: messages,
      generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
      messageMetadata: ({ part }) => (part.type === "finish" ? tracer.totals() : undefined),
      onEnd: async ({ messages: all }) => {
        if (!persist) return;
        await persistSafely(persist, {
          messages: all,
          steps: tracer.steps,
          totals: tracer.totals(),
        });
      },
    }),
  });
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

/**
 * ES: Política de cada paso: primero el control de aprobación (una tarjeta mostrada sin
 *     pedir aprobación obliga a pedirla, incluso en el último paso), luego el cierre del
 *     último paso y, en cualquier otro paso, todas las herramientas con el prompt base.
 *     El prompt base se repite porque el AI SDK arrastra a los pasos siguientes las
 *     instrucciones que fija un paso, y la nota de un paso forzado no debe quedarse.
 * EN: Per-step policy: first the approval control (a card shown without asking for
 *     approval forces the request, even on the last step), then the last-step closing
 *     and, on any other step, all tools with the base prompt. The base prompt is repeated
 *     because the AI SDK carries a step's instructions over to later steps, and a forced
 *     step's note must not stay.
 */
export function turnStepPolicy(instructions: string, toolNames: ReadonlyArray<string>) {
  const approval = approvalStepPolicy(instructions);
  const final = finalStepPolicy(instructions);
  const gated = { activeTools: [...toolNames], instructions };
  return (options: {
    stepNumber: number;
    steps: ReadonlyArray<StepLike>;
  }): { activeTools: string[]; instructions?: string } =>
    approval(options) ?? final(options) ?? gated;
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
    const { tools, context } = await buildTools(client, registry, dependencies.memory);
    dependencies.onContext?.(context);
    const instructions = buildSystemPrompt({
      context,
      capabilities: capabilitiesOf(dependencies.memory),
      preferences: await savedPreferences(dependencies.memory),
    });
    const tracer = createTurnTracer(modelName(dependencies.model));
    const result = streamText({
      model: dependencies.model,
      instructions,
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: isStepCount(MAX_STEPS),
      prepareStep: turnStepPolicy(instructions, Object.keys(tools)),
      ...tracer.callbacks,
      onEnd: close,
      onAbort: close,
      onError: close,
    });
    return turnResponse(result.stream, messages, tracer, dependencies.persist);
  } catch (error) {
    await close();
    throw error;
  }
}
