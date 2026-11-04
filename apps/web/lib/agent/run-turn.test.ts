import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { MAX_STEPS, streamAgentTurn } from "./run-turn";
import { fixtureMcpConnection, scriptedModel } from "./test-support";

const QUESTION: UIMessage[] = [
  { id: "m1", role: "user", parts: [{ type: "text", text: "¿Cómo me fue en octubre?" }] },
];

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

  it("expone solo herramientas de lectura mientras no existan las de aprobación", async () => {
    const model = scriptedModel(() => ({ text: "Hola." }));
    await (await streamAgentTurn(QUESTION, { model, mcp: fixtureMcpConnection() })).text();
    const [first] = model.doStreamCalls as unknown as DoStreamCall[];
    const names = first!.tools?.map((tool) => tool.name) ?? [];
    expect(names).toContain("compare_periods");
    expect(names).not.toContain("create_campaign_draft");
    expect(names).not.toContain("send_campaign");
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
