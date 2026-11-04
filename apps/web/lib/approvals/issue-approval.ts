/**
 * ES: Emisión de aprobaciones a partir de lo que la persona vio en la tarjeta de campaña.
 *     El token resultante solo sirve para ese contenido exacto (ADR-08).
 * EN: Approval issuance from what the person saw on the campaign card. The resulting
 *     token only works for that exact content (ADR-08).
 */
import {
  campaignDraftSchema,
  createApprovalContent,
  issueApprovalToken,
  sendApprovalContentFromDraft,
  type ApprovalStore,
  type CampaignDraft,
} from "@alborada/mcp-server";
import { z } from "zod";

export const ApprovalRequest = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), campaign: campaignDraftSchema }),
  z.object({
    action: z.literal("send"),
    campaign_id: z.string().min(1),
    campaign: campaignDraftSchema,
  }),
]);
export type ApprovalRequest = z.infer<typeof ApprovalRequest>;

export type IssueDependencies = {
  secret: string;
  store: ApprovalStore;
  businessId: string;
  now?: () => Date;
};

export async function issueApproval(request: ApprovalRequest, dependencies: IssueDependencies) {
  const draft = request.campaign as CampaignDraft;
  const isSend = request.action === "send";
  const content = isSend
    ? sendApprovalContentFromDraft(request.campaign_id, draft)
    : createApprovalContent(draft);
  const { token, record } = await issueApprovalToken(
    {
      action: request.action,
      businessId: dependencies.businessId,
      content,
      campaignId: isSend ? request.campaign_id : undefined,
    },
    dependencies,
  );
  return {
    approval_token: token,
    approval_id: record.id,
    expires_at: record.expiresAt.toISOString(),
  };
}
