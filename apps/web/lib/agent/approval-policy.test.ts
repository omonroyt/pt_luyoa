import { describe, expect, it } from "vitest";
import { missingApproval, type StepLike } from "./approval-policy";
import { MAX_STEPS, turnStepPolicy } from "./run-turn";

const card = (state: string): StepLike => ({
  content: [
    { type: "tool-call", toolName: "show_campaign_card", input: { state } },
    { type: "tool-result", toolName: "show_campaign_card", input: { state } },
  ],
});
const failedCard: StepLike = {
  content: [
    { type: "tool-call", toolName: "show_campaign_card", input: { state: "proposal" } },
    { type: "tool-error", toolName: "show_campaign_card", input: { state: "proposal" } },
  ],
};
const ask = (toolName: string): StepLike => ({ content: [{ type: "tool-call", toolName }] });
const text: StepLike = { content: [{ type: "text" }] };

describe("control de aprobación del orquestador", () => {
  it("una propuesta mostrada sin pedir aprobación obliga a pedir la del borrador", () => {
    expect(missingApproval([card("proposal")])).toBe("request_draft_approval");
    expect(missingApproval([card("draft")])).toBe("request_send_approval");
  });

  it("no obliga nada si ya se pidió la aprobación, si la tarjeta falló o si ya se envió", () => {
    expect(missingApproval([card("proposal"), ask("request_draft_approval")])).toBeUndefined();
    expect(missingApproval([failedCard, text])).toBeUndefined();
    expect(missingApproval([card("sent")])).toBeUndefined();
    expect(missingApproval([])).toBeUndefined();
  });

  it("una tarjeta nueva después de una aprobación vuelve a exigirla (cambios pedidos)", () => {
    expect(
      missingApproval([card("proposal"), ask("request_draft_approval"), card("proposal")]),
    ).toBe("request_draft_approval");
  });

  it("el paso siguiente solo deja la herramienta de aprobación y la fuerza, aun en el último paso", () => {
    const policy = turnStepPolicy("PROMPT");
    expect(policy({ stepNumber: 1, steps: [card("proposal")] })).toEqual({
      activeTools: ["request_draft_approval"],
      toolChoice: { type: "tool", toolName: "request_draft_approval" },
    });
    expect(policy({ stepNumber: MAX_STEPS - 1, steps: [card("draft")] })).toMatchObject({
      toolChoice: { type: "tool", toolName: "request_send_approval" },
    });
    expect(policy({ stepNumber: MAX_STEPS - 1, steps: [text] })).toMatchObject({ activeTools: [] });
    expect(policy({ stepNumber: 1, steps: [text] })).toBeUndefined();
  });
});
