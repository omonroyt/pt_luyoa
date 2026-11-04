import { z } from "zod";
import { BlockBase } from "./base";

export const CampaignCardState = z.enum([
  "proposal",
  "awaiting_draft_approval",
  "draft",
  "awaiting_send_approval",
  "sent",
  "discarded",
]);
export type CampaignCardState = z.infer<typeof CampaignCardState>;

export const CampaignChannel = z.enum(["push", "whatsapp", "email"]);
export type CampaignChannel = z.infer<typeof CampaignChannel>;

const Range = z.tuple([z.number(), z.number()]).describe("Rango [mínimo, máximo]");

const Reach = z
  .object({
    matched: z.number(),
    reachable: z.number(),
    excludedNoConsent: z.number(),
    excludedSuspended: z.number(),
    excludedDuplicates: z.number(),
    otherChannels: z.array(z.object({ channel: z.string(), reachable: z.number() })).optional(),
  })
  .describe("Alcance del canal elegido, tal como lo devolvió audience_reach");

const Offer = z.object({
  type: z.enum(["percent_off", "points_multiplier", "two_for_one", "free_item"]),
  value: z.number().optional(),
  productId: z.string().optional(),
  productName: z.string().optional(),
  validFrom: z.string().describe("AAAA-MM-DD, posterior a la fecha de corte"),
  validTo: z.string().describe("AAAA-MM-DD"),
});

/**
 * ES: Tarjeta de campaña (07 §3.4): propuesta, borrador o enviada. Reúne la evidencia de
 *     la recomendación; las cifras vienen de audience_reach, offer_economics,
 *     estimate_campaign_impact y campaign_performance.
 * EN: Campaign card (07 §3.4): proposal, draft or sent. It gathers the recommendation
 *     evidence; figures come from audience_reach, offer_economics,
 *     estimate_campaign_impact and campaign_performance.
 */
export const CampaignCardBlock = BlockBase.extend({
  state: CampaignCardState,
  campaignId: z.string().optional().describe("Id de la campaña a partir del estado draft"),
  name: z.string(),
  objective: z.string(),
  audience: z.object({
    filters: z.record(z.string(), z.union([z.string(), z.number()])),
    description: z.string(),
  }),
  channel: CampaignChannel,
  reach: Reach,
  offer: Offer,
  economics: z.object({
    costPerRedemption: z.number(),
    marginNote: z.string(),
    totalCostRange: Range,
  }),
  expectedImpact: z
    .object({ extraVisitsRange: Range, extraSalesRange: Range, basis: z.string() })
    .optional(),
  history: z.array(
    z.object({
      name: z.string(),
      lift: z.number().nullable(),
      n: z.number(),
      reliable: z.boolean(),
    }),
  ),
  message: z.object({ text: z.string(), length: z.number(), limit: z.number() }),
  warnings: z.array(z.string()),
  approvalId: z.string().optional(),
});
export type CampaignCardBlock = z.infer<typeof CampaignCardBlock>;
