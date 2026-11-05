/**
 * ES: Contenido exacto que se va a aprobar: lo que la persona ve aquí es lo que firma el
 *     token, así que se muestra sin resumir el mensaje ni las fechas.
 * EN: Exact content to be approved: what the person sees here is what the token signs, so
 *     the message and dates are shown without summarizing.
 */
import { MESSAGE_LIMITS, messageLength } from "@alborada/shared";
import type { CampaignPreview } from "@/lib/ui/approvals";
import { audienceText, channelLabel, offerLabel } from "@/lib/ui/campaign";

export function ApprovalSummary({ preview }: { preview: CampaignPreview }) {
  const offer = { type: preview.offer.type, value: preview.offer.value };
  const product = preview.offer.product_id ? { productId: preview.offer.product_id } : {};
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm [&_dt]:text-muted">
      <dt>Campaña</dt>
      <dd>{preview.name}</dd>
      <dt>Canal</dt>
      <dd>{channelLabel(preview.channel)}</dd>
      <dt>Audiencia</dt>
      <dd className="break-words">{audienceText(preview.audience)}</dd>
      <dt>Oferta</dt>
      <dd>
        {offerLabel({ ...offer, ...product })} · {preview.offer.valid_from} a{" "}
        {preview.offer.valid_to}
      </dd>
      <dt>Mensaje</dt>
      <dd>
        <p className="whitespace-pre-wrap rounded-lg bg-background px-2 py-1">{preview.message}</p>
        <p className="text-xs text-muted">
          {messageLength(preview.message)}/{MESSAGE_LIMITS[preview.channel]} caracteres
        </p>
      </dd>
    </dl>
  );
}
