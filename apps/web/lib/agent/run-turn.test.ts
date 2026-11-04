import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { PRESENTATION_TOOLS } from "./presentation-tools";
import { INVALID_BLOCK_MESSAGE, MAX_STEPS, streamAgentTurn } from "./run-turn";
import { fixtureMcpConnection, scriptedModel } from "./test-support";

const QUESTION: UIMessage[] = [
  { id: "m1", role: "user", parts: [{ type: "text", text: "¿Cómo me fue en octubre?" }] },
];

const KPIS = {
  title: "Octubre vs septiembre 2026",
  period: { from: "2026-10-01", to: "2026-10-31" },
  sources: ["src_d9f5b950bf"],
  items: [
    { key: "net_sales", label: "Ventas netas", value: 808254, unit: "mxn" },
    { key: "tickets", label: "Tickets", value: 8680, unit: "count" },
  ],
};

const COMPARE = {
  toolName: "compare_periods",
  input: { current: "last_full_month", previous: "previous_full_month" },
};

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

  it("expone lectura y presentación, pero no escrituras mientras no existan las aprobaciones", async () => {
    const model = scriptedModel(() => ({ text: "Hola." }));
    await (await streamAgentTurn(QUESTION, { model, mcp: fixtureMcpConnection() })).text();
    const [first] = model.doStreamCalls as unknown as DoStreamCall[];
    const names = first!.tools?.map((tool) => tool.name) ?? [];
    expect(names).toEqual(expect.arrayContaining(["compare_periods", ...PRESENTATION_TOOLS]));
    expect(names).not.toContain("create_campaign_draft");
    expect(names).not.toContain("send_campaign");
    expect(systemText(first!)).toContain("show_chart");
  });

  it("envía el bloque de indicadores a la interfaz cuando es válido", async () => {
    const model = scriptedModel((_hasTools, call) =>
      call === 0 ? { toolName: "show_kpis", input: KPIS } : { text: "Listo." },
    );
    const body = await (
      await streamAgentTurn(QUESTION, { model, mcp: fixtureMcpConnection() })
    ).text();
    expect(body).toContain('"toolName":"show_kpis"');
    expect(body).toContain("tool-output-available");
  });

  it("devuelve al modelo el error de un bloque inválido para que lo corrija", async () => {
    const oneItem = { ...KPIS, items: KPIS.items.slice(0, 1) };
    const model = scriptedModel((_hasTools, call) => {
      if (call === 0) return { toolName: "show_kpis", input: oneItem };
      if (call === 1) return { toolName: "show_kpis", input: KPIS };
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
