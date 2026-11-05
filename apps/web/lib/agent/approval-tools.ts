/**
 * ES: Herramientas de aprobación (ADR-08, IMP-34): el primer candado. No tienen execute:
 *     cuando el modelo las llama, el turno se detiene y la interfaz muestra la tarjeta con
 *     sus botones. Solo si la persona aprueba, la interfaz pide el token a /api/approvals y
 *     lo devuelve como resultado de la herramienta; el servidor nunca auto-aprueba. El
 *     segundo candado es el MCP, que exige ese token firmado, de un solo uso y ligado al
 *     contenido exacto.
 * EN: Approval tools (ADR-08, IMP-34): the first lock. They have no execute: when the
 *     model calls them, the turn stops and the UI shows the card with its buttons. Only if
 *     the person approves does the UI request the token from /api/approvals and return it
 *     as the tool result; the server never auto-approves. The second lock is the MCP,
 *     which requires that signed, single-use token bound to the exact content.
 */
import { campaignDraftSchema } from "@alborada/mcp-server";
import { tool, type ToolSet } from "ai";
import { z } from "zod";

export const APPROVAL_TOOLS = ["request_draft_approval", "request_send_approval"] as const;

/**
 * ES: Resultado que entrega la interfaz: el token emitido por /api/approvals o el rechazo
 *     de la persona, con los cambios que pidió.
 * EN: Result delivered by the UI: the token issued by /api/approvals or the person's
 *     rejection, with the changes they asked for.
 */
export const ApprovalOutput = z.discriminatedUnion("approved", [
  z.object({
    approved: z.literal(true),
    approval_token: z.string().min(1),
    approval_id: z.string().min(1),
    expires_at: z.string(),
  }),
  z.object({ approved: z.literal(false), reason: z.string().optional() }),
]);
export type ApprovalOutput = z.infer<typeof ApprovalOutput>;

const DRAFT_DESCRIPTION = [
  "Pide a la persona aprobar la creación del borrador de una campaña ya mostrada con",
  "show_campaign_card. La interfaz muestra los botones y devuelve approval_token si la",
  "persona aprueba, o approved: false con su motivo. Con el token, llama",
  "create_campaign_draft con el mismo campaign, sin cambiar nada.",
].join(" ");

const SEND_DESCRIPTION = [
  "Pide a la persona aprobar el envío de un borrador ya creado. Devuelve approval_token si",
  "aprueba; con él, llama send_campaign con el mismo campaign_id. Si la persona no aprueba,",
  "no envíes nada.",
].join(" ");

export function createApprovalTools(): ToolSet {
  return {
    request_draft_approval: tool({
      description: DRAFT_DESCRIPTION,
      inputSchema: z.object({ campaign: campaignDraftSchema }),
      outputSchema: ApprovalOutput,
    }),
    request_send_approval: tool({
      description: SEND_DESCRIPTION,
      inputSchema: z.object({ campaign_id: z.string().min(1), campaign: campaignDraftSchema }),
      outputSchema: ApprovalOutput,
    }),
  };
}
