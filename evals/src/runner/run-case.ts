/**
 * ES: Corre un caso contra el agente real dentro del proceso (IMP-51): mismo orquestador,
 *     mismas herramientas y mismo MCP que /api/chat, con el fetch de evaluación (fallas y
 *     escrituras simuladas). El corredor hace de la persona: envía cada turno y responde
 *     las aprobaciones según el caso. Devuelve la transcripción con trazas, costo y tiempos.
 * EN: Runs a case against the real agent in-process (IMP-51): same orchestrator, tools and
 *     MCP as /api/chat, with the evaluation fetch (faults and simulated writes). The runner
 *     plays the person: it sends each turn and answers approvals as the case says. It
 *     returns the transcript with traces, cost and timings.
 */
import { randomBytes } from "node:crypto";
import { createMemoryApprovalStore, createServerFactory } from "@alborada/mcp-server";
import { streamAgentTurn, type TraceStep, type TurnTotals } from "@alborada/web/agent";
import type { LanguageModel, UIMessage } from "ai";
import type { ApprovalReply, EvalCase } from "../cases/case-schema";
import { answerApproval, pendingApprovalOf, withToolOutput, type Issuer } from "./approval-replies";
import { createEvalFetch } from "./eval-fetch";
import { readAgentResponse } from "./ui-stream";

export type RunDependencies = {
  model: LanguageModel;
  api: { apiKey: string; apiBaseUrl: string };
  businessId: string;
  realFetch?: typeof fetch;
  now?: () => Date;
  // ES: Tope de solicitudes al agente por caso, para que un error no gaste sin límite.
  // EN: Cap on agent requests per case, so a bug cannot spend without limit.
  maxRequests?: number;
};

export type RequestRecord = {
  turn: number;
  steps: TraceStep[];
  totals: TurnTotals | undefined;
  firstTextMs: number | null;
  totalMs: number;
  errors: string[];
};

export type CaseTranscript = {
  caseId: string;
  messages: UIMessage[];
  requests: RequestRecord[];
  writes: ReturnType<typeof createEvalFetch>["writes"];
  faultHits: ReturnType<typeof createEvalFetch>["faultHits"];
  replies: ApprovalReply[];
  pendingApproval: boolean;
};

const DEFAULT_MAX_REQUESTS = 8;
const PERSIST_WAIT_MS = 2000;

const userMessage = (index: number, text: string): UIMessage => ({
  id: `u${index}`,
  role: "user",
  parts: [{ type: "text", text }],
});

function setup(evalCase: EvalCase, deps: RunDependencies) {
  const evalFetch = createEvalFetch(evalCase.faults, deps.realFetch, deps.now);
  const issuer: Issuer = {
    secret: randomBytes(32).toString("hex"),
    store: createMemoryApprovalStore(),
    businessId: deps.businessId,
    now: deps.now,
  };
  const createServer = createServerFactory(deps.api, {
    fetchImpl: evalFetch.fetch,
    now: deps.now,
    approvals: { secret: issuer.secret, store: issuer.store },
  });
  const mcp = { serviceToken: randomBytes(24).toString("hex"), createServer };
  return { evalFetch, issuer, mcp };
}

type Session = ReturnType<typeof setup> & { deps: RunDependencies; transcript: CaseTranscript };

/**
 * ES: Una solicitud al agente; si el último mensaje es del asistente (tras responder una
 *     aprobación), el stream continúa ese mismo mensaje, como en la interfaz.
 * EN: One agent request; if the last message is the assistant's (after answering an
 *     approval), the stream continues that same message, as in the UI.
 */
async function requestTurn(session: Session, turn: number) {
  const { transcript } = session;
  let captured: { steps: TraceStep[]; totals: TurnTotals } | undefined;
  let persisted: () => void = () => undefined;
  const done = new Promise<void>((resolve) => (persisted = resolve));
  const startedAt = performance.now();
  const response = await streamAgentTurn(transcript.messages, {
    model: session.deps.model,
    mcp: session.mcp,
    persist: async (record) => {
      captured = { steps: record.steps, totals: record.totals };
      persisted();
    },
  });
  const last = transcript.messages.at(-1);
  const previous = last?.role === "assistant" ? last : undefined;
  const read = await readAgentResponse(response, previous, startedAt);
  await Promise.race([done, new Promise((resolve) => setTimeout(resolve, PERSIST_WAIT_MS))]);
  if (read.message) {
    transcript.messages = previous
      ? [...transcript.messages.slice(0, -1), read.message]
      : [...transcript.messages, read.message];
  }
  transcript.requests.push({
    turn,
    ...read,
    steps: captured?.steps ?? [],
    totals: captured?.totals,
  });
  return read.message;
}

type PlannedTurn = { user: string; approvals: ApprovalReply[] };

/**
 * ES: Siguiente respuesta a una aprobación pendiente. Si las del turno se acabaron, el
 *     texto del siguiente turno se entrega como "Cambiar" y sus respuestas pasan a este.
 * EN: Next answer to a pending approval. If the turn's answers ran out, the next turn's
 *     text is delivered as "Cambiar" and its answers move to this one.
 */
function nextReply(turns: PlannedTurn[], index: number): ApprovalReply | undefined {
  const turn = turns[index];
  const own = turn?.approvals.shift();
  if (own) return own;
  const next = turns[index + 1];
  if (!turn || !next) return undefined;
  turn.approvals.push(...next.approvals);
  turns.splice(index + 1, 1);
  return { change: next.user };
}

async function answerPending(session: Session, turns: PlannedTurn[], index: number) {
  const { transcript } = session;
  const maxRequests = session.deps.maxRequests ?? DEFAULT_MAX_REQUESTS;
  let message = transcript.messages.at(-1);
  for (let pending = pendingApprovalOf(message); pending; pending = pendingApprovalOf(message)) {
    if (!message || transcript.requests.length >= maxRequests) return;
    const reply = nextReply(turns, index);
    if (!reply) return;
    transcript.replies.push(reply);
    const output = await answerApproval(pending, reply, session.issuer);
    const answered = withToolOutput(message, pending.toolCallId, output);
    transcript.messages = [...transcript.messages.slice(0, -1), answered];
    message = await requestTurn(session, index);
  }
}

export async function runCase(evalCase: EvalCase, deps: RunDependencies): Promise<CaseTranscript> {
  const parts = setup(evalCase, deps);
  const transcript: CaseTranscript = {
    caseId: evalCase.id,
    messages: [],
    requests: [],
    writes: parts.evalFetch.writes,
    faultHits: parts.evalFetch.faultHits,
    replies: [],
    pendingApproval: false,
  };
  const session: Session = { ...parts, deps, transcript };
  const turns: PlannedTurn[] = evalCase.turns.map((turn) => ({
    user: turn.user,
    approvals: [...turn.approvals],
  }));
  for (let index = 0; index < turns.length; index += 1) {
    const turn = turns[index];
    if (!turn) break;
    transcript.messages.push(userMessage(index, turn.user));
    await requestTurn(session, index);
    await answerPending(session, turns, index);
  }
  transcript.pendingApproval = pendingApprovalOf(transcript.messages.at(-1)) !== undefined;
  return transcript;
}
