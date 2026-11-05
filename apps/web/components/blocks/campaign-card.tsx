/**
 * ES: Tarjeta de campaña (07 §3.4). Muestra la propuesta y su estado; no tiene botones de
 *     aprobación propios: la aprobación vive en el panel de request_*_approval, que
 *     enseña el contenido exacto que se firma.
 * EN: Campaign card (07 §3.4). It shows the proposal and its state; it has no approval
 *     buttons of its own: approval lives in the request_*_approval panel, which shows the
 *     exact content being signed.
 */
import { MESSAGE_LIMITS, messageLength, type CampaignCardBlock } from "@alborada/shared";
import { stateBadge } from "@/lib/ui/campaign";
import { BlockFrame } from "./block-frame";
import { CampaignDetails, CampaignHistory } from "./campaign-details";

export function CampaignCard({ block }: { block: CampaignCardBlock }) {
  return (
    <BlockFrame block={block}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">📣 {block.name}</p>
        <span className="rounded-full border border-accent px-2 py-0.5 text-xs font-semibold text-accent">
          {stateBadge(block)}
        </span>
      </div>
      <p className="text-sm">Objetivo: {block.objective}</p>
      <CampaignDetails block={block} />
      <div className="text-sm">
        <p className="text-muted">
          Mensaje ({messageLength(block.message.text)}/{MESSAGE_LIMITS[block.channel]})
        </p>
        <p className="whitespace-pre-wrap rounded-lg bg-background px-2 py-1">
          {block.message.text}
        </p>
      </div>
      <CampaignHistory history={block.history} />
      {block.warnings.length ? (
        <ul className="flex flex-col gap-1 text-sm" aria-label="Advertencias">
          {block.warnings.map((warning) => (
            <li key={warning}>
              <span aria-hidden="true">⚠ </span>
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
    </BlockFrame>
  );
}
