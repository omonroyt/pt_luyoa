/**
 * ES: Esquemas de entrada de audiencia, canal y oferta, con los valores que acepta la
 *     API (docs/specs/CONTEXTO_PRUEBA_TECNICA.md §7.5 y 05_DISENO_MCP.md §1.2).
 * EN: Audience, channel and offer input schemas, with the values the API accepts
 *     (docs/specs/CONTEXTO_PRUEBA_TECNICA.md §7.5 and 05_DISENO_MCP.md §1.2).
 */
import { z } from "zod";
import { CHANNELS, SEGMENT_IDS } from "../api/schemas";

export const channelSchema = z.enum(CHANNELS).describe("Canal: push, whatsapp o email");
export type Channel = z.infer<typeof channelSchema>;

export const segmentIdSchema = z
  .enum(SEGMENT_IDS)
  .describe("Segmento: new, dormant, at_risk, champions, regulars u occasional");

export const audienceSchema = z
  .object({
    segment_id: segmentIdSchema.optional(),
    home_location_id: z.string().optional().describe("Sucursal de origen del cliente"),
    tier: z.enum(["bronce", "plata", "oro"]).optional(),
    inactive_days_min: z.number().int().min(1).optional().describe("Días mínimos sin venir"),
    min_visits: z.number().int().min(1).optional().describe("Visitas mínimas históricas"),
  })
  .describe("Filtros de audiencia de campaña; se combinan entre sí");
export type Audience = z.infer<typeof audienceSchema>;

export const OFFER_TYPES = [
  "percent_off",
  "points_multiplier",
  "two_for_one",
  "free_item",
] as const;
export type OfferType = (typeof OFFER_TYPES)[number];

export const offerSchema = z
  .object({
    type: z.enum(OFFER_TYPES),
    value: z
      .number()
      .positive()
      .optional()
      .describe("Obligatorio en percent_off (porcentaje) y points_multiplier (multiplicador)"),
    product_id: z
      .string()
      .optional()
      .describe("Obligatorio en two_for_one y free_item (id de producto)"),
  })
  .describe("Oferta de la campaña");
export type Offer = z.infer<typeof offerSchema>;

export const campaignDraftSchema = z
  .object({
    name: z.string().min(1).max(120),
    objective: z.string().min(1).max(300),
    channel: channelSchema,
    audience: audienceSchema,
    offer: offerSchema.extend({
      valid_from: z.string().describe("Inicio AAAA-MM-DD, posterior a data_as_of"),
      valid_to: z.string().describe("Fin AAAA-MM-DD"),
    }),
    message: z.string().describe("Máximo 140 caracteres en push, 1024 en WhatsApp, 5000 en email"),
  })
  .describe("Contenido exacto de la campaña que la persona aprobó");
