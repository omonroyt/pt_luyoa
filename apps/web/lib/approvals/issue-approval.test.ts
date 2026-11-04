import { contentHash, createMemoryApprovalStore, sendApprovalContent } from "@alborada/mcp-server";
import { describe, expect, it } from "vitest";
import { ApprovalRequest, issueApproval } from "./issue-approval";

const NOW = new Date("2026-11-04T12:00:00Z");
const CAMPAIGN = {
  name: "Te extrañamos noviembre",
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

const dependencies = () => ({
  secret: "s".repeat(40),
  store: createMemoryApprovalStore(),
  businessId: "biz_alborada",
  now: () => NOW,
});

describe("ApprovalRequest", () => {
  it("rechaza solicitudes sin campaña o con una acción desconocida", () => {
    expect(ApprovalRequest.safeParse({ action: "create" }).success).toBe(false);
    expect(ApprovalRequest.safeParse({ action: "delete", campaign: CAMPAIGN }).success).toBe(false);
    expect(ApprovalRequest.safeParse({ action: "send", campaign: CAMPAIGN }).success).toBe(false);
  });
});

describe("issueApproval", () => {
  it("emite un token de creación con expiración de 10 minutos y lo registra", async () => {
    const deps = dependencies();
    const request = ApprovalRequest.parse({ action: "create", campaign: CAMPAIGN });
    const approval = await issueApproval(request, deps);
    expect(approval.approval_token.split(".")).toHaveLength(2);
    expect(approval.expires_at).toBe("2026-11-04T12:10:00.000Z");
    expect(await deps.store.consume(approval.approval_id)).toBe(true);
  });

  it("firma para el envío el mismo contenido que el MCP leerá del borrador guardado", () => {
    const stored = {
      id: "cmp_1",
      name: CAMPAIGN.name,
      objective: CAMPAIGN.objective,
      status: "draft",
      channel: "whatsapp" as const,
      audience_description: null,
      offer_type: "free_item",
      offer_value: null,
      offer_product_id: "prd_concha",
      valid_from: "2026-11-10",
      valid_to: "2026-11-24",
      message: CAMPAIGN.message,
      created_at: "2026-11-04T12:00:00Z",
      sent_at: null,
      audience_size: null,
      simulated: true,
      results: null,
    };
    const request = ApprovalRequest.parse({
      action: "send",
      campaign_id: "cmp_1",
      campaign: CAMPAIGN,
    });
    expect(request.action).toBe("send");
    return issueApproval(request, dependencies()).then((approval) => {
      const payload = JSON.parse(
        Buffer.from(approval.approval_token.split(".")[0] ?? "", "base64url").toString(),
      );
      expect(payload.h).toBe(contentHash(sendApprovalContent(stored)));
      expect(payload.cid).toBe("cmp_1");
    });
  });
});
