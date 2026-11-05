import type { UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";
import {
  approvalOutcomeOf,
  approvalViewOf,
  changeRequestOutput,
  discardOutput,
  hasPendingApproval,
  requestApproval,
} from "./approvals";
import { audienceText, countRange, mxnRange, offerLabel, stateBadge } from "./campaign";

const campaign = {
  name: "Te extrañamos · Coyoacán",
  objective: "Recuperar clientes en riesgo",
  channel: "whatsapp",
  audience: { segment_id: "at_risk", home_location_id: "loc_coyoacan" },
  offer: {
    type: "free_item",
    product_id: "prd_latte",
    valid_from: "2026-11-10",
    valid_to: "2026-11-24",
  },
  message: "¡Te extrañamos! Tu bebida va por nuestra cuenta.",
};

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("panel de aprobación", () => {
  it("lee el contenido a aprobar y conserva el original sin modificar", () => {
    const view = approvalViewOf("request_send_approval", { campaign_id: "cmp_1", campaign });
    expect(view?.action).toBe("send");
    expect(view?.campaignId).toBe("cmp_1");
    expect(view?.campaign).toBe(campaign);
    expect(approvalViewOf("request_draft_approval", { campaign: { name: "x" } })).toBeNull();
  });

  it("pide el token con el mismo contenido y devuelve la aprobación", async () => {
    const issued = {
      approval_token: "tok",
      approval_id: "apr_1",
      expires_at: "2026-11-05T00:00:00Z",
    };
    const fetcher = vi.fn(async () => jsonResponse(201, issued));
    const view = approvalViewOf("request_draft_approval", { campaign });
    if (!view) throw new Error("vista inválida");
    await expect(requestApproval(view, fetcher)).resolves.toEqual({ approved: true, ...issued });
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/approvals");
    expect(JSON.parse(String(init.body))).toEqual({ action: "create", campaign });
  });

  it("no aprueba nada si el servidor rechaza la solicitud", async () => {
    const fetcher = vi.fn(async () => jsonResponse(400, { error: { code: "validation_error" } }));
    const view = approvalViewOf("request_draft_approval", { campaign });
    if (!view) throw new Error("vista inválida");
    await expect(requestApproval(view, fetcher)).rejects.toThrow("No se pudo registrar");
  });

  it("distingue aprobación, cambios y descarte en el resultado", () => {
    expect(approvalOutcomeOf({ approved: true, approval_token: "t" })).toBe("approved");
    expect(approvalOutcomeOf(changeRequestOutput("  otro horario "))).toBe("changes");
    expect(changeRequestOutput("  otro horario ")).toEqual({
      approved: false,
      reason: "La persona pidió cambios: otro horario",
    });
    expect(approvalOutcomeOf(discardOutput())).toBe("discarded");
    expect(approvalOutcomeOf(undefined)).toBeUndefined();
  });
});

describe("textos de la tarjeta", () => {
  it("muestra el estado con el id del borrador", () => {
    expect(stateBadge({ state: "proposal" })).toBe("PROPUESTA");
    expect(stateBadge({ state: "draft", campaignId: "cmp_9" })).toBe("BORRADOR cmp_9");
  });

  it("describe la oferta y los rangos", () => {
    expect(offerLabel({ type: "percent_off", value: 15 })).toBe("15% de descuento");
    expect(offerLabel({ type: "free_item", productName: "Latte" })).toBe("Latte gratis");
    expect(mxnRange([1200, 2400])).toBe("$1,200 a $2,400");
    expect(countRange([12, 12])).toBe("12");
    expect(audienceText({ segment_id: "at_risk", min_visits: 4 })).toBe(
      "Segmento: at_risk · Visitas mínimas: 4",
    );
    expect(audienceText({})).toBe("Toda la base");
  });
});

describe("aprobación pendiente", () => {
  const message = (state: string) =>
    [
      {
        id: "m1",
        role: "assistant",
        parts: [{ type: "tool-request_draft_approval", toolCallId: "a1", state, input: {} }],
      },
    ] as unknown as UIMessage[];

  it("bloquea la entrada solo mientras la aprobación espera respuesta", () => {
    expect(hasPendingApproval(message("input-available"))).toBe(true);
    expect(hasPendingApproval(message("output-available"))).toBe(false);
    expect(hasPendingApproval([])).toBe(false);
  });
});
