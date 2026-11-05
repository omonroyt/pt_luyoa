/**
 * ES: Reglas de un borrador de campaña que se validan antes de pedir aprobación o de
 *     llamar la API (trampa T-11): longitud del mensaje por canal, vigencia posterior a
 *     data_as_of y campos obligatorios de la oferta.
 * EN: Campaign draft rules validated before requesting approval or calling the API
 *     (pitfall T-11): message length per channel, validity after data_as_of and the
 *     offer's required fields.
 */
import { MESSAGE_LIMITS } from "@alborada/shared";
import type { Product } from "../api/schemas";
import { ToolFailure } from "../errors";
import { resolveOfferProduct } from "./offers";

// ES: Los límites por canal son un contrato compartido con el agente y la interfaz.
// EN: Per-channel limits are a contract shared with the agent and the UI.
export { MESSAGE_LIMITS };
export type Channel = keyof typeof MESSAGE_LIMITS;

export type CampaignDraft = {
  name: string;
  objective: string;
  channel: Channel;
  audience: Record<string, string | number | undefined>;
  offer: {
    type: string;
    value?: number;
    product_id?: string;
    valid_from: string;
    valid_to: string;
  };
  message: string;
};

function fail(message: string, suggestion: string): never {
  throw new ToolFailure({ code: "validation_error", message, suggestion });
}

function assertMessage(draft: CampaignDraft): void {
  const limit = MESSAGE_LIMITS[draft.channel];
  if (draft.message.trim().length === 0)
    fail("El mensaje está vacío.", "Redactar el mensaje de la campaña.");
  if (draft.message.length > limit) {
    fail(
      `El mensaje tiene ${draft.message.length} caracteres y el límite de ${draft.channel} es ${limit}.`,
      `Recortar el mensaje a ${limit} caracteres o menos.`,
    );
  }
}

function assertValidity(draft: CampaignDraft, dataAsOf: string): void {
  const { valid_from: from, valid_to: to } = draft.offer;
  if (from <= dataAsOf) {
    fail(
      `La oferta inicia el ${from}, pero debe iniciar después de la fecha de corte (${dataAsOf}).`,
      "Usar como inicio el primer día válido para ofertas de get_business_context.",
    );
  }
  if (to < from)
    fail(`La vigencia termina (${to}) antes de iniciar (${from}).`, "Corregir valid_to.");
}

/**
 * ES: Valida el borrador completo y devuelve el producto de la oferta si aplica.
 * EN: Validates the full draft and returns the offer product when applicable.
 */
export function validateCampaignDraft(
  draft: CampaignDraft,
  context: { dataAsOf: string; products: readonly Product[] },
): Product | undefined {
  if (draft.name.trim().length === 0)
    fail("La campaña no tiene nombre.", "Agregar un nombre breve.");
  assertMessage(draft);
  assertValidity(draft, context.dataAsOf);
  return resolveOfferProduct(draft.offer, context.products);
}
