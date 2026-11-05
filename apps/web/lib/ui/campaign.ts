/**
 * ES: Textos de la tarjeta de campaña (07 §3.4): etiqueta del estado, canal, oferta y
 *     rangos.
 * EN: Campaign card texts (07 §3.4): state badge, channel, offer and ranges.
 */
import type { CampaignCardBlock, CampaignCardState, CampaignChannel } from "@alborada/shared";
import { formatMxn } from "./format";

const STATE_BADGES: Record<CampaignCardState, string> = {
  proposal: "PROPUESTA",
  awaiting_draft_approval: "PROPUESTA",
  draft: "BORRADOR",
  awaiting_send_approval: "BORRADOR",
  sent: "ENVIADA ✓ (simulado)",
  discarded: "DESCARTADA",
};

export function stateBadge(block: Pick<CampaignCardBlock, "state" | "campaignId">): string {
  const badge = STATE_BADGES[block.state];
  const isDraft = block.state === "draft" || block.state === "awaiting_send_approval";
  return isDraft && block.campaignId ? `${badge} ${block.campaignId}` : badge;
}

export const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  push: "Push",
  whatsapp: "WhatsApp",
  email: "Email",
};

export function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel as CampaignChannel] ?? channel;
}

type OfferLike = { type: string; value?: number; productName?: string; productId?: string };

function productOf(offer: OfferLike): string {
  return offer.productName ?? offer.productId ?? "producto";
}

const OFFER_TEXT: Record<string, (offer: OfferLike) => string> = {
  percent_off: (offer) => `${offer.value ?? "?"}% de descuento`,
  points_multiplier: (offer) => `Puntos ×${offer.value ?? "?"}`,
  two_for_one: (offer) => `2×1 en ${productOf(offer)}`,
  free_item: (offer) => `${productOf(offer)} gratis`,
};

export function offerLabel(offer: OfferLike): string {
  return OFFER_TEXT[offer.type]?.(offer) ?? offer.type;
}

export function mxnRange([min = 0, max = min]: readonly number[]): string {
  return min === max ? formatMxn(min) : `${formatMxn(min)} a ${formatMxn(max)}`;
}

export function countRange([min = 0, max = min]: readonly number[]): string {
  const format = (value: number) => value.toLocaleString("es-MX");
  return min === max ? format(min) : `${format(min)} a ${format(max)}`;
}

// ES: Nombre legible de cada filtro de audiencia; el valor se muestra tal cual se firma.
// EN: Readable name of each audience filter; the value is shown exactly as it is signed.
const AUDIENCE_LABELS: Record<string, string> = {
  segment_id: "Segmento",
  home_location_id: "Sucursal",
  tier: "Nivel",
  inactive_days_min: "Días mínimos sin venir",
  min_visits: "Visitas mínimas",
};

export function audienceText(audience: Record<string, string | number>): string {
  const filters = Object.entries(audience).map(
    ([key, value]) => `${AUDIENCE_LABELS[key] ?? key}: ${value}`,
  );
  return filters.length ? filters.join(" · ") : "Toda la base";
}
