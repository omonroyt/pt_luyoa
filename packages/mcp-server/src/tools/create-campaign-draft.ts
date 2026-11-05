import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createCampaign, fetchProducts, previewAudience } from "../api/endpoints";
import { createApprovalContent } from "../approvals/campaign-content";
import { verifyApprovalToken } from "../approvals/approval-token";
import { requireApprovals, requireLocation, type ToolContext } from "../context";
import { validateCampaignDraft, type CampaignDraft } from "../domain/campaign-rules";
import { createSource } from "../source";
import { campaignDraftSchema } from "./campaign-schemas";
import { runTool } from "./tool-kit";

export const CREATE_CAMPAIGN_DRAFT = "create_campaign_draft";

const DESCRIPTION = [
  "Crea una campaña en borrador (no contacta a nadie). Exige approval_token: el token que",
  "devuelve la aprobación de la persona en la interfaz para este contenido exacto. Sin",
  "token válido no se crea nada. Valida antes el mensaje, la vigencia y la oferta. Nunca",
  "llamar sin que la persona haya visto audiencia, canal, oferta, mensaje y alcance.",
].join(" ");

const INPUT = {
  campaign: campaignDraftSchema,
  approval_token: z.string().min(1).describe("Token emitido por la aprobación de la persona"),
};

/**
 * ES: Registra create_campaign_draft (escenario E-06, R-06). Orden: validar, verificar
 *     y consumir el token, y solo entonces escribir en la API.
 * EN: Registers create_campaign_draft (scenario E-06, R-06). Order: validate, verify
 *     and consume the token, and only then write to the API.
 */
export function registerCreateCampaignDraft(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    CREATE_CAMPAIGN_DRAFT,
    { title: "Crear borrador de campaña", description: DESCRIPTION, inputSchema: INPUT },
    (args) =>
      runTool(async () => {
        const approvals = requireApprovals(ctx);
        const snapshot = await ctx.getSnapshot();
        const draft = args.campaign as CampaignDraft;
        if (draft.audience.home_location_id) {
          requireLocation(snapshot, String(draft.audience.home_location_id));
        }
        const products = await fetchProducts(ctx.api);
        validateCampaignDraft(draft, {
          dataAsOf: snapshot.window.dataAsOf,
          products: products.data.data,
        });
        await verifyApprovalToken(
          {
            action: "create",
            businessId: snapshot.business.id,
            content: createApprovalContent(draft),
            token: args.approval_token,
          },
          { ...approvals, now: ctx.now },
        );
        const created = await createCampaign(ctx.api, createApprovalContent(draft));
        const reach = await previewAudience(ctx.api, draft.channel, draft.audience);
        return {
          data: {
            campaign_id: created.data.id,
            status: created.data.status,
            reach: reach.data,
            draft,
          },
          notes: [
            "El borrador no contacta a nadie. Para enviarlo se necesita una segunda aprobación de la persona.",
          ],
          warnings: [],
          source: createSource({
            tool: CREATE_CAMPAIGN_DRAFT,
            params: { campaign: args.campaign },
            endpoints: [created.endpoint, reach.endpoint],
            dataAsOf: snapshot.window.dataAsOf,
            now: ctx.now,
          }),
        };
      }),
  );
}
