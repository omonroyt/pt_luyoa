import { describe, expect, it } from "vitest";
import { createApprovalTools } from "./approval-tools";
import { createCardGate } from "./card-gate";

const CAMPAIGN = {
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
  message: "Hace rato que no te vemos. Tu próxima concha va por nuestra cuenta.",
};

async function validates(
  tools: ReturnType<typeof createApprovalTools>,
  name: string,
  input: object,
) {
  const schema = tools[name]?.inputSchema as {
    safeParseAsync: (value: unknown) => Promise<{
      success: boolean;
      error?: { message: string };
    }>;
  };
  return schema.safeParseAsync(input);
}

describe("compuerta de la aprobación (card-gate)", () => {
  it("solo permite la aprobación que corresponde a la última tarjeta verificada", () => {
    const gate = createCardGate();
    expect(gate.allows("request_draft_approval")).toBe(false);
    gate.record("proposal");
    expect(gate.allows("request_draft_approval")).toBe(true);
    expect(gate.allows("request_send_approval")).toBe(false);
    gate.record("draft");
    expect(gate.allows("request_send_approval")).toBe(true);
    expect(gate.allows("request_draft_approval")).toBe(false);
  });

  it("rechaza la aprobación sin tarjeta con una instrucción, y la acepta después", async () => {
    const gate = createCardGate();
    const tools = createApprovalTools(gate);
    const before = await validates(tools, "request_draft_approval", { campaign: CAMPAIGN });
    expect(before.success).toBe(false);
    expect(before.error?.message).toContain("La herramienta sí está disponible");
    gate.record("proposal");
    const after = await validates(tools, "request_draft_approval", { campaign: CAMPAIGN });
    expect(after.success).toBe(true);
  });

  it("sin compuerta solo revisa la forma, para validar el historial de la conversación", async () => {
    const tools = createApprovalTools();
    expect((await validates(tools, "request_draft_approval", { campaign: CAMPAIGN })).success).toBe(
      true,
    );
  });
});
