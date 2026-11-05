/**
 * ES: Lógica del panel de aprobación (ADR-08, IMP-42). La persona ve el contenido exacto
 *     que el agente pidió aprobar (la entrada de request_*_approval) y solo si pulsa
 *     aprobar se pide el token a /api/approvals con ese mismo contenido, sin tocarlo. El
 *     resultado se entrega al agente con addToolOutput. Cambiar o descartar devuelven
 *     approved: false con el motivo.
 * EN: Approval panel logic (ADR-08, IMP-42). The person sees the exact content the agent
 *     asked to approve (the request_*_approval input) and only if they press approve is
 *     the token requested from /api/approvals with that same content, untouched. The
 *     result is delivered to the agent with addToolOutput. Change or discard return
 *     approved: false with the reason.
 */
import { CampaignChannel } from "@alborada/shared";
import type { UIMessage } from "ai";
import { z } from "zod";
import type { ApprovalOutput } from "@/lib/agent/approval-tools";
import { toolViewOf } from "./tool-parts";

export const APPROVAL_ACTIONS = {
  request_draft_approval: "create",
  request_send_approval: "send",
} as const;
export type ApprovalToolName = keyof typeof APPROVAL_ACTIONS;

// ES: Solo los campos que se muestran; el servidor valida el contenido completo.
// EN: Only the displayed fields; the server validates the full content.
const CampaignPreview = z.object({
  name: z.string(),
  objective: z.string(),
  channel: CampaignChannel,
  audience: z.record(z.string(), z.union([z.string(), z.number()])),
  offer: z.object({
    type: z.string(),
    value: z.number().optional(),
    product_id: z.string().optional(),
    valid_from: z.string(),
    valid_to: z.string(),
  }),
  message: z.string(),
});
export type CampaignPreview = z.infer<typeof CampaignPreview>;

const ApprovalInput = z.object({
  campaign_id: z.string().optional(),
  campaign: z.unknown(),
});

export type ApprovalView = {
  action: (typeof APPROVAL_ACTIONS)[ApprovalToolName];
  campaignId: string | undefined;
  preview: CampaignPreview;
  campaign: unknown;
};

export function isApprovalTool(name: string): name is ApprovalToolName {
  return name in APPROVAL_ACTIONS;
}

export function approvalViewOf(name: ApprovalToolName, input: unknown): ApprovalView | null {
  const parsed = ApprovalInput.safeParse(input);
  const preview = CampaignPreview.safeParse(parsed.data?.campaign);
  if (!parsed.success || !preview.success) return null;
  return {
    action: APPROVAL_ACTIONS[name],
    campaignId: parsed.data.campaign_id,
    preview: preview.data,
    campaign: parsed.data.campaign,
  };
}

const IssuedApproval = z.object({
  approval_token: z.string().min(1),
  approval_id: z.string().min(1),
  expires_at: z.string(),
});

export class ApprovalRequestError extends Error {}

/**
 * ES: Pide el token con el contenido sin modificar. Un error de red o una respuesta
 *     inesperada no aprueba nada: la persona ve el error y puede intentar de nuevo.
 * EN: Requests the token with the unmodified content. A network error or an unexpected
 *     response approves nothing: the person sees the error and can try again.
 */
export async function requestApproval(
  view: ApprovalView,
  fetcher: typeof fetch = fetch,
): Promise<ApprovalOutput> {
  const body = { action: view.action, campaign: view.campaign, campaign_id: view.campaignId };
  const response = await fetcher("/api/approvals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const issued = IssuedApproval.safeParse(await response.json().catch(() => null));
  if (!response.ok || !issued.success) {
    throw new ApprovalRequestError("No se pudo registrar la aprobación.");
  }
  return { approved: true, ...issued.data };
}

export const DISCARD_REASON = "La persona descartó la campaña.";

export function changeRequestOutput(changes: string): ApprovalOutput {
  return { approved: false, reason: `La persona pidió cambios: ${changes.trim()}` };
}

export function discardOutput(): ApprovalOutput {
  return { approved: false, reason: DISCARD_REASON };
}

export type ApprovalOutcome = "approved" | "changes" | "discarded";

export function approvalOutcomeOf(output: unknown): ApprovalOutcome | undefined {
  const value = output as Partial<{ approved: boolean; reason: string }> | null;
  if (value?.approved === true) return "approved";
  if (value?.approved !== false) return undefined;
  return value.reason === DISCARD_REASON ? "discarded" : "changes";
}

/**
 * ES: Una aprobación sin resolver en el último mensaje bloquea la entrada de texto: el
 *     agente espera el resultado de esa llamada y la decisión se toma con los botones.
 * EN: An unresolved approval in the last message locks the text input: the agent is
 *     waiting for that call's result and the decision is made with the buttons.
 */
export function hasPendingApproval(messages: UIMessage[]): boolean {
  const last = messages.at(-1);
  if (last?.role !== "assistant") return false;
  return last.parts.some((part) => {
    const tool = toolViewOf(part);
    return tool !== null && isApprovalTool(tool.name) && tool.state === "input-available";
  });
}
