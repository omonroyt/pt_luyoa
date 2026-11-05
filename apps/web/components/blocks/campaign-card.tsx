/**
 * ES: Tarjeta de campaña (07 §3.4). Muestra la propuesta y su estado (el nombre solo si
 *     difiere del título), con el mensaje como vista previa de cómo lo recibirá el
 *     cliente. No tiene botones de aprobación propios: la aprobación vive en el panel de
 *     request_*_approval, que enseña el contenido exacto que se firma.
 * EN: Campaign card (07 §3.4). It shows the proposal and its state (the name only if it
 *     differs from the title), with the message as a preview of how the customer will
 *     receive it. It has no approval buttons of its own: approval lives in the
 *     request_*_approval panel, which shows the exact content being signed.
 */
import { MESSAGE_LIMITS, messageLength, type CampaignCardBlock } from "@alborada/shared";
import { Icon } from "@/components/ui/icon";
import { channelLabel, stateBadge } from "@/lib/ui/campaign";
import { BlockFrame } from "./block-frame";
import { CampaignDetails, CampaignHistory } from "./campaign-details";

function MessagePreview({ block }: { block: CampaignCardBlock }) {
  return (
    <div className="rounded-2xl bg-surface/70 p-3">
      <p className="mb-2 flex items-center justify-between gap-2 text-xs text-muted">
        <span>Vista previa · {channelLabel(block.channel)}</span>
        <span className="tabular-nums">
          {messageLength(block.message.text)}/{MESSAGE_LIMITS[block.channel]}
        </span>
      </p>
      <p className="max-w-md whitespace-pre-wrap rounded-2xl rounded-tl-md border border-border bg-card px-3.5 py-2.5 text-sm shadow-soft">
        {block.message.text}
      </p>
    </div>
  );
}

export function CampaignCard({ block }: { block: CampaignCardBlock }) {
  return (
    <BlockFrame block={block}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <Icon name="megaphone" className="mt-0.5 size-6 shrink-0 text-accent" />
          <div className="min-w-0">
            {block.name === block.title ? null : <p className="font-semibold">{block.name}</p>}
            <p className="text-sm text-muted">Objetivo: {block.objective}</p>
          </div>
        </div>
        <span className="rounded-full border border-accent px-2.5 py-1 text-xs font-semibold text-accent">
          {stateBadge(block)}
        </span>
      </div>
      <CampaignDetails block={block} />
      <MessagePreview block={block} />
      <CampaignHistory history={block.history} />
      {block.warnings.length ? (
        <ul
          className="flex flex-col gap-1.5 rounded-2xl border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm"
          aria-label="Advertencias"
        >
          {block.warnings.map((warning) => (
            <li key={warning} className="flex gap-2">
              <Icon name="alert" className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </BlockFrame>
  );
}
