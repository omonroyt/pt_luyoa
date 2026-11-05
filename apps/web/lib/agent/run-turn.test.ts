import type { UIMessage } from "ai";
import { beforeAll, describe, expect, it } from "vitest";
import { APPROVAL_TOOLS } from "./approval-tools";
import { PRESENTATION_TOOLS } from "./presentation-tools";
import { MAX_STEPS, streamAgentTurn } from "./run-turn";
import { INVALID_BLOCK_MESSAGE, UNVERIFIED_BLOCK_MESSAGE } from "./ui-errors";
import { fixtureMcpConnection, scriptedModel, sourceIdOf } from "./test-support";

const QUESTION: UIMessage[] = [
  { id: "m1", role: "user", parts: [{ type: "text", text: "¿Cómo me fue en octubre?" }] },
];

const COMPARE = {
  toolName: "compare_periods",
  input: { current: "last_full_month", previous: "previous_full_month" },
};

const SEGMENTS = { toolName: "customer_segments", input: { segment_ids: ["at_risk", "dormant"] } };

// ES: source.id que el MCP asigna a cada consulta con las fixtures.
// EN: source.id the MCP assigns to each query with the fixtures.
let compareId: string;
let segmentsId: string;

beforeAll(async () => {
  compareId = await sourceIdOf(COMPARE.toolName, COMPARE.input);
  segmentsId = await sourceIdOf(SEGMENTS.toolName, SEGMENTS.input);
});

const kpis = () => ({
  title: "Octubre vs septiembre 2026",
  period: { from: "2026-10-01", to: "2026-10-31" },
  sources: [compareId],
  items: [
    { key: "net_sales", label: "Ventas netas", value: 808254, unit: "mxn" },
    { key: "tickets", label: "Tickets", value: 8680, unit: "count" },
  ],
});

const lostCustomers = (total: number) => ({
  title: "Clientes que estás perdiendo",
  period: { from: "2026-10-31", to: "2026-10-31" },
  sources: [segmentsId],
  items: [
    { key: "at_risk", label: "En riesgo", value: 483, unit: "count" },
    { key: "dormant", label: "Dormidos", value: 367, unit: "count" },
    { key: "total", label: "Total", value: total, unit: "count" },
  ],
});

type DoStreamCall = {
  prompt: Array<{ role: string; content: unknown }>;
  tools?: Array<{ name: string }>;
};

const systemText = (call: DoStreamCall) =>
  call.prompt
    .filter((message) => message.role === "system")
    .map((message) => String(message.content))
    .join("\n");

describe("streamAgentTurn", () => {
  it("llama una herramienta del MCP y responde en streaming con el resultado", async () => {
    const model = scriptedModel((_hasTools, call) =>
      call === 0 ? COMPARE : { text: "En octubre vendiste más que en septiembre." },
    );
    const response = await streamAgentTurn(QUESTION, { model, mcp: fixtureMcpConnection() });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("compare_periods");
    expect(body).toContain("En octubre vendiste más que en septiembre.");
    const [first, second] = model.doStreamCalls as unknown as DoStreamCall[];
    expect(systemText(first!)).toContain("2026-10-31");
    expect(second!.prompt.some((message) => message.role === "tool")).toBe(true);
  });

  it("expone las escrituras solo junto con las herramientas de aprobación", async () => {
    const model = scriptedModel(() => ({ text: "Hola." }));
    await (await streamAgentTurn(QUESTION, { model, mcp: fixtureMcpConnection() })).text();
    const [first] = model.doStreamCalls as unknown as DoStreamCall[];
    const names = first!.tools?.map((tool) => tool.name) ?? [];
    expect(names).toEqual(
      expect.arrayContaining([
        "compare_periods",
        ...PRESENTATION_TOOLS,
        ...APPROVAL_TOOLS,
        "create_campaign_draft",
        "send_campaign",
      ]),
    );
    expect(names).toHaveLength(20);
    expect(systemText(first!)).toContain("show_chart");
    expect(systemText(first!)).toContain("request_draft_approval");
  });

  it("envía el bloque de indicadores cuando sus cifras salen de la fuente consultada", async () => {
    const model = scriptedModel((_hasTools, call) => {
      if (call === 0) return COMPARE;
      if (call === 1) return { toolName: "show_kpis", input: kpis() };
      return { text: "Listo." };
    });
    const body = await (
      await streamAgentTurn(QUESTION, { model, mcp: fixtureMcpConnection() })
    ).text();
    expect(body).toContain('"toolName":"show_kpis"');
    expect(body).toContain("tool-output-available");
    expect(body).not.toContain(UNVERIFIED_BLOCK_MESSAGE);
  });

  it("acepta el total que entrega customer_segments en lugar de una suma del modelo", async () => {
    const model = scriptedModel((_hasTools, call) => {
      if (call === 0) return SEGMENTS;
      if (call === 1) return { toolName: "show_kpis", input: lostCustomers(850) };
      return { text: "Listo." };
    });
    const body = await (
      await streamAgentTurn(QUESTION, { model, mcp: fixtureMcpConnection() })
    ).text();
    expect(body).not.toContain(UNVERIFIED_BLOCK_MESSAGE);
  });

  it("rechaza una cifra sin fuente, la devuelve al modelo y avisa a la interfaz", async () => {
    const model = scriptedModel((_hasTools, call) => {
      if (call === 0) return SEGMENTS;
      if (call === 1) return { toolName: "show_kpis", input: lostCustomers(1000) };
      return { text: "Listo." };
    });
    const body = await (
      await streamAgentTurn(QUESTION, { model, mcp: fixtureMcpConnection() })
    ).text();
    const [, , third] = model.doStreamCalls as unknown as DoStreamCall[];
    const toolMessages = JSON.stringify(third!.prompt.filter((m) => m.role === "tool"));
    expect(toolMessages).toContain("Verificación de cifras");
    expect(toolMessages).toContain("1000");
    expect(body).toContain(UNVERIFIED_BLOCK_MESSAGE);
    expect(body).not.toContain("error del servicio");
  });

  it("devuelve al modelo el error de un bloque inválido para que lo corrija", async () => {
    const oneItem = { ...kpis(), items: kpis().items.slice(0, 1) };
    const model = scriptedModel((_hasTools, call) => {
      if (call === 0) return { toolName: "show_kpis", input: oneItem };
      if (call === 1) return { toolName: "show_kpis", input: kpis() };
      return { text: "Listo." };
    });
    const body = await (
      await streamAgentTurn(QUESTION, { model, mcp: fixtureMcpConnection() })
    ).text();
    const [, second] = model.doStreamCalls as unknown as DoStreamCall[];
    const toolMessages = JSON.stringify(second!.prompt.filter((m) => m.role === "tool"));
    expect(toolMessages).toContain("show_kpis");
    expect(toolMessages).toMatch(/error/i);
    // ES: La interfaz recibe un aviso de corrección, no el mensaje de falla del servicio.
    // EN: The UI receives a correction notice, not the service failure message.
    expect(body).toContain(INVALID_BLOCK_MESSAGE);
    expect(body).not.toContain("error del servicio");
  });

  it("en el último paso retira las herramientas y pide cerrar con lo obtenido", async () => {
    const model = scriptedModel((hasTools) =>
      hasTools ? COMPARE : { text: "Esto es lo que alcancé a revisar." },
    );
    const body = await (
      await streamAgentTurn(QUESTION, { model, mcp: fixtureMcpConnection() })
    ).text();
    const calls = model.doStreamCalls as unknown as DoStreamCall[];

    expect(calls).toHaveLength(MAX_STEPS);
    expect(calls.at(-1)!.tools ?? []).toHaveLength(0);
    expect(systemText(calls.at(-1)!)).toContain("LÍMITE DE PASOS");
    expect(body).toContain("Esto es lo que alcancé a revisar.");
  });
});
