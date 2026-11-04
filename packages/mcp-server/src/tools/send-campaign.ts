import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchCampaign, sendCampaign } from "../api/endpoints";
import { sendApprovalContent } from "../approvals/campaign-content";
import { verifyApprovalToken } from "../approvals/approval-token";
import { requireApprovals, type ToolContext } from "../context";
import { ToolFailure } from "../errors";
import { createSource } from "../source";
import { runTool } from "./tool-kit";

export const SEND_CAMPAIGN = "send_campaign";

const DESCRIPTION = [
  "Envía una campaña en borrador (envío simulado por la API). Exige approval_token de la",
  "segunda aprobación de la persona, emitido para este borrador exacto. Un borrador solo",
  "se envía una vez. Nunca llamar sin que la persona haya aprobado el envío.",
].join(" ");

const INPUT = {
  campaign_id: z.string().min(1),
  approval_token: z.string().min(1).describe("Token emitido por la aprobación de envío"),
};

/**
 * ES: Registra send_campaign (escenario E-06, R-06). El contenido que se verifica sale del
 *     borrador guardado en la API, no de lo que diga el modelo.
 * EN: Registers send_campaign (scenario E-06, R-06). The verified content comes from the
 *     draft stored in the API, not from what the model says.
 */
export function registerSendCampaign(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    SEND_CAMPAIGN,
    { title: "Enviar campaña", description: DESCRIPTION, inputSchema: INPUT },
    (args) =>
      runTool(async () => {
        const approvals = requireApprovals(ctx);
        const snapshot = await ctx.getSnapshot();
        const draft = await fetchCampaign(ctx.api, args.campaign_id);
        if (draft.data.status !== "draft") {
          throw new ToolFailure({
            code: "conflict",
            message: `La campaña ${args.campaign_id} no está en borrador (estado: ${draft.data.status}).`,
            suggestion: "Un borrador solo se envía una vez; consultar su estado con lookup.",
          });
        }
        await verifyApprovalToken(
          {
            action: "send",
            businessId: snapshot.business.id,
            campaignId: args.campaign_id,
            content: sendApprovalContent(draft.data),
            token: args.approval_token,
          },
          { ...approvals, now: ctx.now },
        );
        const sent = await sendCampaign(ctx.api, args.campaign_id);
        return {
          data: {
            campaign_id: sent.data.id,
            status: sent.data.status,
            sent_at: sent.data.sent_at ?? null,
            audience_size: sent.data.audience_size ?? null,
          },
          notes: ["El envío es simulado por la API: nadie recibe mensajes reales."],
          warnings: [],
          source: createSource({
            tool: SEND_CAMPAIGN,
            endpoints: [draft.endpoint, sent.endpoint],
            dataAsOf: snapshot.window.dataAsOf,
            now: ctx.now,
          }),
        };
      }),
  );
}
