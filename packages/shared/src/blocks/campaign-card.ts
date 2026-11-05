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

/**
 * ES: Longitud máxima del mensaje por canal (T-11), verificada por el MCP antes de crear y
 *     por el verificador de bloques antes de mostrar la tarjeta.
 * EN: Maximum message length per channel (T-11), checked by the MCP before creating and by
 *     the block verifier before showing the card.
 */
export const MESSAGE_LIMITS = { push: 140, whatsapp: 1024, email: 5000 } as const satisfies Record<
  CampaignChannel,
  number
>;

/**
 * ES: Longitud de un mensaje según el MCP y el verificador. Cuenta unidades UTF-16, así que
 *     un emoji cuenta 2: es conservador, porque no está verificado cómo cuenta la API, y
 *     un mensaje que pasa esta regla no excede el límite por contar de menos.
 * EN: Message length as counted by the MCP and the verifier. It counts UTF-16 units, so an
 *     emoji counts 2: it is conservative, because how the API counts is not verified, and a
 *     message that passes this rule does not exceed the limit by undercounting.
 */
export function messageLength(text: string): number {
  return text.length;
}

// ES: Lista de exactamente dos números y no z.tuple: el proveedor original de GLM (Z.AI)
//     rechaza toda la solicitud si una herramienta usa un esquema de tupla (prefixItems).
// EN: A list of exactly two numbers rather than z.tuple: GLM's original provider (Z.AI)
//     rejects the whole request if a tool uses a tuple schema (prefixItems).
const Range = z.array(z.number()).min(2).max(2).describe("Rango [mínimo, máximo]");

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
