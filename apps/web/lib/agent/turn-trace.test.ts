import type { UIMessage } from "ai";
import { beforeAll, describe, expect, it } from "vitest";
import { streamAgentTurn, type PersistTurn } from "./run-turn";
import {
  fixtureMcpConnection,
  scriptedModel,
  sourceIdOf,
  TEST_CALL_COST,
  type ScriptedReply,
} from "./test-support";

const QUESTION: UIMessage[] = [
  { id: "u1", role: "user", parts: [{ type: "text", text: "¿Cómo me fue en octubre?" }] },
];
const COMPARE_INPUT = { current: "last_full_month", previous: "previous_full_month" };

let compareId: string;

beforeAll(async () => {
  compareId = await sourceIdOf("compare_periods", COMPARE_INPUT);
});

const kpis = (sales: number) => ({
  title: "Octubre vs septiembre",
  period: { from: "2026-10-01", to: "2026-10-31" },
  sources: [compareId],
  items: [
    { key: "net_sales", label: "Ventas netas", value: sales, unit: "mxn" },
    { key: "tickets", label: "Tickets", value: 8680, unit: "count" },
  ],
  reason: "mostrar las cifras clave",
});

async function traceOf(script: ScriptedReply[]) {
  const saved: Array<Parameters<PersistTurn>[0]> = [];
  const model = scriptedModel((_hasTools, call) => script[call] ?? { text: "Listo." });
  const response = await streamAgentTurn(QUESTION, {
    model,
    mcp: fixtureMcpConnection(),
    persist: async (turn) => {
      saved.push(turn);
    },
  });
  const body = await response.text();
  const [turn] = saved;
  if (!turn) throw new Error("El turno no se guardó");
  return { body, turn };
}

const compare: ScriptedReply = {
  toolName: "compare_periods",
  input: { ...COMPARE_INPUT, reason: "comparar octubre con septiembre" },
};

describe("traza del turno (IMP-35)", () => {
  it("registra cada llamada al modelo y cada herramienta con razón, fuente y duración", async () => {
    const { turn } = await traceOf([compare, { toolName: "show_kpis", input: kpis(808254) }]);
    expect(turn.steps.map((step) => `${step.kind}:${step.name}`)).toEqual([
      "llm:mock-model-id",
      "tool:compare_periods",
      "llm:mock-model-id",
      "presentation:show_kpis",
      "llm:mock-model-id",
    ]);
    const [, tool] = turn.steps;
    expect(tool).toMatchObject({
      reason: "comparar octubre con septiembre",
      input: COMPARE_INPUT,
      outputSummary: { source: compareId, warnings: 1 },
    });
    expect(Number.isInteger(tool?.latencyMs)).toBe(true);
  });

  it("suma tokens y costo de OpenRouter y los envía como metadatos del mensaje", async () => {
    const { body, turn } = await traceOf([compare]);
    expect(turn.totals).toMatchObject({ llmCalls: 2, tokensIn: 20, tokensOut: 10 });
    expect(turn.totals.costUsd).toBeCloseTo(2 * TEST_CALL_COST);
    expect(body).toContain('"messageMetadata"');
    expect(body).toContain('"llmCalls":2');
  });

  it("guarda el mensaje del asistente con id para ligar la traza", async () => {
    const { turn } = await traceOf([compare]);
    const last = turn.messages.at(-1);
    expect(last?.role).toBe("assistant");
    expect(last?.id).toMatch(/^msg/);
  });

  it("registra la aprobación pendiente como esperando a la persona", async () => {
    const campaign = {
      name: "Te extrañamos",
      objective: "Recuperar clientes en riesgo",
      channel: "whatsapp",
      audience: { segment_id: "at_risk" },
      offer: {
        type: "free_item",
        product_id: "prd_concha",
        valid_from: "2026-11-10",
        valid_to: "2026-11-24",
      },
      message: "Tu próxima concha va por nuestra cuenta.",
    };
    const { turn } = await traceOf([
      { toolName: "request_draft_approval", input: { campaign, reason: "pedir aprobación" } },
    ]);
    expect(turn.steps.find((step) => step.kind === "approval")).toMatchObject({
      name: "request_draft_approval",
      reason: "pedir aprobación",
      outputSummary: { awaiting: "person" },
    });
  });

  it("registra los argumentos inválidos y los bloques rechazados por el verificador", async () => {
    const { turn } = await traceOf([
      compare,
      { toolName: "show_kpis", input: { ...kpis(808254), items: [] } },
      { toolName: "show_kpis", input: kpis(999999) },
      { toolName: "request_draft_approval", input: { campaign: {}, reason: "pedir aprobación" } },
    ]);
    const codes = turn.steps.filter((step) => step.errorCode).map((step) => step.errorCode);
    expect(codes).toEqual(expect.arrayContaining(["invalid_input", "figure_verification"]));
  });
});
