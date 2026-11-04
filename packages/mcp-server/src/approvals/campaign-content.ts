/**
 * ES: Contenido exacto que se firma en cada aprobación. La aplicación usa estas mismas
 *     funciones al emitir el token, así el hash coincide solo si lo ejecutado es lo que
 *     la persona vio.
 * EN: Exact content signed in each approval. The application uses these same functions
 *     when issuing the token, so the hash matches only if what runs is what the person saw.
 */
import type { Campaign } from "../api/schemas";
import type { CampaignDraft } from "../domain/campaign-rules";

const orUndefined = <T>(value: T | null | undefined): T | undefined => value ?? undefined;

export function createApprovalContent(draft: CampaignDraft) {
  return {
    name: draft.name,
    objective: draft.objective,
    channel: draft.channel,
    audience: draft.audience,
    offer: draft.offer,
    message: draft.message,
  };
}

/**
 * ES: Contenido del envío, tomado del borrador guardado en la API (no de lo que diga el
 *     modelo), para garantizar que lo enviado es lo aprobado.
 * EN: Send content, taken from the draft stored in the API (not from what the model
 *     says), to guarantee that what is sent is what was approved.
 */
export function sendApprovalContent(campaign: Campaign) {
  return {
    campaign_id: campaign.id,
    name: campaign.name,
    channel: campaign.channel,
    message: campaign.message,
    offer: {
      type: campaign.offer_type,
      value: orUndefined(campaign.offer_value),
      product_id: orUndefined(campaign.offer_product_id),
      valid_from: campaign.valid_from,
      valid_to: campaign.valid_to,
    },
  };
}

/**
 * ES: El mismo contenido de envío, armado desde el borrador que la persona vio en la
 *     tarjeta. Si la API guardó algo distinto, los hashes no coinciden y el envío se rechaza.
 * EN: The same send content, built from the draft the person saw on the card. If the API
 *     stored something different, the hashes do not match and the send is rejected.
 */
export function sendApprovalContentFromDraft(campaignId: string, draft: CampaignDraft) {
  return {
    campaign_id: campaignId,
    name: draft.name,
    channel: draft.channel,
    message: draft.message,
    offer: {
      type: draft.offer.type,
      value: orUndefined(draft.offer.value),
      product_id: orUndefined(draft.offer.product_id),
      valid_from: draft.offer.valid_from,
      valid_to: draft.offer.valid_to,
    },
  };
}
