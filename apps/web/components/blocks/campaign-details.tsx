/**
 * ES: Evidencia de la tarjeta de campaña (07 §3.4): audiencia, canal, alcance real con sus
 *     exclusiones, oferta, costo, impacto esperado e historial de campañas parecidas.
 * EN: Campaign card evidence (07 §3.4): audience, channel, real reach with its exclusions,
 *     offer, cost, expected impact and history of similar campaigns.
 */
import type { CampaignCardBlock } from "@alborada/shared";
import { channelLabel, countRange, mxnRange, offerLabel } from "@/lib/ui/campaign";
import { formatMxn } from "@/lib/ui/format";

const count = (value: number) => value.toLocaleString("es-MX");

function ReachText({ reach }: { reach: CampaignCardBlock["reach"] }) {
  const others = reach.otherChannels?.map(
    (other) => `${channelLabel(other.channel)}: ${count(other.reachable)}`,
  );
  return (
    <>
      <strong>
        {count(reach.reachable)} de {count(reach.matched)}
      </strong>{" "}
      · {count(reach.excludedNoConsent)} sin consentimiento, {count(reach.excludedSuspended)}{" "}
      suspendidos, {count(reach.excludedDuplicates)} duplicados
      {others?.length ? <span className="text-muted"> ({others.join(" · ")})</span> : null}
    </>
  );
}

export function CampaignDetails({ block }: { block: CampaignCardBlock }) {
  const { offer, economics, expectedImpact } = block;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm [&_dt]:text-muted">
      <dt>Audiencia</dt>
      <dd>{block.audience.description}</dd>
      <dt>Canal</dt>
      <dd>{channelLabel(block.channel)}</dd>
      <dt>Alcance</dt>
      <dd>
        <ReachText reach={block.reach} />
      </dd>
      <dt>Oferta</dt>
      <dd>
        {offerLabel(offer)} · {offer.validFrom} a {offer.validTo}
      </dd>
      <dt>Costo</dt>
      <dd>
        {formatMxn(economics.costPerRedemption)} por canje · {mxnRange(economics.totalCostRange)}{" "}
        total
        <span className="block text-muted">{economics.marginNote}</span>
      </dd>
      {expectedImpact ? (
        <>
          <dt>Impacto</dt>
          <dd>
            +{countRange(expectedImpact.extraVisitsRange)} visitas · +
            {mxnRange(expectedImpact.extraSalesRange)} en ventas
            <span className="block text-muted">Base: {expectedImpact.basis}</span>
          </dd>
        </>
      ) : null}
    </dl>
  );
}

export function CampaignHistory({ history }: { history: CampaignCardBlock["history"] }) {
  if (history.length === 0) return null;
  return (
    <div className="text-sm">
      <p className="text-muted">Campañas parecidas</p>
      <ul className="flex flex-col gap-1">
        {history.map((item) => (
          <li key={item.name}>
            {item.name}: lift {item.lift === null ? "sin dato" : `${item.lift} pts`} · n={item.n}
            {item.reliable ? "" : " · poco confiable"}
          </li>
        ))}
      </ul>
    </div>
  );
}
