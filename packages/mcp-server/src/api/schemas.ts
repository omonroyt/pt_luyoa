/**
 * ES: Esquemas de las respuestas de la API, escritos a partir de respuestas reales
 *     (docs/specs/05_DISENO_MCP.md §1.3). zod descarta los campos no declarados:
 *     el cliente nunca declara nombre, teléfono, correo, fecha de nacimiento ni número
 *     de tarjeta, así que esos datos personales no entran al MCP.
 * EN: API response schemas, written from real responses (docs/specs/05_DISENO_MCP.md
 *     §1.3). zod drops undeclared fields: the customer schema never declares name,
 *     phone, email, birth date or card number, so that personal data never enters the MCP.
 */
import { z } from "zod";

export const CHANNELS = ["push", "whatsapp", "email"] as const;
export const SEGMENT_IDS = [
  "new",
  "dormant",
  "at_risk",
  "champions",
  "regulars",
  "occasional",
] as const;

export const Pagination = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  has_more: z.boolean(),
});

export const listOf = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), pagination: Pagination.optional() });

export const Business = z.object({
  id: z.string(),
  name: z.string(),
  timezone: z.string(),
  currency: z.string(),
  data_from: z.string(),
  data_as_of: z.string(),
  points_rule: z.string(),
  reward_rule: z.string(),
});
export type Business = z.infer<typeof Business>;

export const Location = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  opened_at: z.string(),
});
export type Location = z.infer<typeof Location>;

export const Product = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  price: z.number(),
  unit_cost: z.number(),
});
export type Product = z.infer<typeof Product>;

export const Segment = z.object({
  id: z.string(),
  description: z.string(),
  customers: z.number(),
  avg_spend: z.number(),
  total_spend: z.number(),
  push_consent_rate: z.number(),
  whatsapp_consent_rate: z.number(),
  email_consent_rate: z.number(),
});
export type Segment = z.infer<typeof Segment>;

export const CustomerSummary = z.object({
  id: z.string(),
  signup_date: z.string(),
  home_location_id: z.string(),
  card_status: z.string(),
  wallet_installed: z.boolean(),
  consent_push: z.boolean(),
  consent_whatsapp: z.boolean(),
  consent_email: z.boolean(),
  tier: z.string(),
  points_balance: z.number(),
  visits_count: z.number(),
  visits_60d: z.number(),
  last_visit_at: z.string().nullable(),
  total_spend: z.number(),
  avg_ticket: z.number(),
  favorite_product_id: z.string().nullable(),
  segment: z.string(),
});
export type CustomerSummary = z.infer<typeof CustomerSummary>;

const GroupKey = z.union([z.string(), z.number()]);

export const SalesRow = z.object({
  key: GroupKey,
  label: z.string().optional(),
  transactions: z.number(),
  net_sales: z.number().optional(),
  avg_ticket: z.number().optional(),
  discounts: z.number().optional(),
  gross_profit: z.number().optional(),
  member_share: z.number().optional(),
  active_days: z.number().optional(),
  transactions_per_day: z.number().optional(),
  units: z.number().optional(),
  gross_sales: z.number().optional(),
  gross_profit_before_discounts: z.number().optional(),
});
export type SalesRow = z.infer<typeof SalesRow>;

export const VisitsRow = z.object({
  key: GroupKey,
  label: z.string().optional(),
  visits: z.number(),
  unique_customers: z.number(),
  purchase_rate: z.number(),
  active_days: z.number(),
  visits_per_day: z.number(),
});
export type VisitsRow = z.infer<typeof VisitsRow>;

export const AnalyticsResponse = <T extends z.ZodType>(row: T) =>
  z.object({ group_by: z.string(), data: z.array(row) });

export const CampaignResults = z.object({
  targeted: z.number(),
  control_size: z.number(),
  sent: z.number(),
  delivered: z.number(),
  opened: z.number(),
  redeemed: z.number(),
  attributed_revenue: z.number(),
  discount_cost: z.number(),
  attributed_gross_profit: z.number(),
  treatment_visit_rate: z.number().nullable(),
  control_visit_rate: z.number().nullable(),
});
export type CampaignResults = z.infer<typeof CampaignResults>;

export const Campaign = z.object({
  id: z.string(),
  name: z.string(),
  objective: z.string().nullable(),
  status: z.string(),
  channel: z.enum(CHANNELS),
  audience_description: z.string().nullable(),
  offer_type: z.string(),
  offer_value: z.number().nullable(),
  offer_product_id: z.string().nullable(),
  valid_from: z.string(),
  valid_to: z.string(),
  message: z.string(),
  created_at: z.string(),
  sent_at: z.string().nullable(),
  audience_size: z.number().nullable(),
  simulated: z.boolean(),
  results: CampaignResults.nullable(),
});
export type Campaign = z.infer<typeof Campaign>;

/**
 * ES: Respuesta de crear o enviar una campaña. Se exige solo id y status y se conservan
 *     los demás campos, porque la forma exacta aún no está verificada contra /openapi.json.
 * EN: Response of creating or sending a campaign. Only id and status are required and
 *     other fields are kept, because the exact shape is not yet verified against /openapi.json.
 */
export const CampaignWriteResult = z.looseObject({
  id: z.string(),
  status: z.string(),
  sent_at: z.string().nullable().optional(),
  audience_size: z.number().nullable().optional(),
});
export type CampaignWriteResult = z.infer<typeof CampaignWriteResult>;

export const AudiencePreview = z.object({
  channel: z.enum(CHANNELS),
  matched: z.number(),
  excluded_suspended: z.number(),
  excluded_no_consent: z.number(),
  excluded_duplicates: z.number(),
  reachable: z.number(),
});
export type AudiencePreview = z.infer<typeof AudiencePreview>;
