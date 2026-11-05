/**
 * ES: Evidencia de la tarjeta de campaña (07 §3.4): audiencia, canal, alcance real con sus
 *     exclusiones, oferta, costo, impacto esperado e historial de campañas parecidas. Cada
 *     dato va en un mosaico con su etiqueta para leerlo de un vistazo.
 * EN: Campaign card evidence (07 §3.4): audience, channel, real reach with its exclusions,
 *     offer, cost, expected impact and history of similar campaigns. Each item sits in a
 *     tile with its label so it reads at a glance.
 */
import type { CampaignCardBlock } from "@alborada/shared";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { channelLabel, countRange, mxnRange, offerLabel } from "@/lib/ui/campaign";
import { formatMxn } from "@/lib/ui/format";

const count = (value: number) => value.toLocaleString("es-MX");

function Tile({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-surface/50 p-3">
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
        <Icon name={icon} className="size-3.5 text-accent" />
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function ReachText({ reach }: { reach: CampaignCardBlock["reach"] }) {
  const others = reach.otherChannels?.map(
    (other) => `${channelLabel(other.channel)}: ${count(other.reachable)}`,
  );
  return (
    <>
      <strong className="font-display text-xl font-semibold tabular-nums">
        {count(reach.reachable)} de {count(reach.matched)}
      </strong>
      <span className="block text-muted">
        {count(reach.excludedNoConsent)} sin consentimiento, {count(reach.excludedSuspended)}{" "}
        suspendidos, {count(reach.excludedDuplicates)} duplicados
      </span>
      {others?.length ? <span className="block text-muted">({others.join(" · ")})</span> : null}
    </>
  );
}

export function CampaignDetails({ block }: { block: CampaignCardBlock }) {
  const { offer, economics, expectedImpact } = block;
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      <Tile icon="users" label="Audiencia">
        {block.audience.description}
      </Tile>
      <Tile icon="message" label="Canal">
        {channelLabel(block.channel)}
      </Tile>
      <Tile icon="megaphone" label="Alcance">
        <ReachText reach={block.reach} />
      </Tile>
      <Tile icon="sparkles" label="Oferta">
        {offerLabel(offer)}
        <span className="block text-muted">
          {offer.validFrom} a {offer.validTo}
        </span>
      </Tile>
      <Tile icon="pie" label="Costo">
        {formatMxn(economics.costPerRedemption)} por canje · {mxnRange(economics.totalCostRange)}{" "}
        total
        <span className="block text-muted">{economics.marginNote}</span>
      </Tile>
      {expectedImpact ? (
        <Tile icon="trendingUp" label="Impacto">
          +{countRange(expectedImpact.extraVisitsRange)} visitas · +
          {mxnRange(expectedImpact.extraSalesRange)} en ventas
          <span className="block text-muted">Base: {expectedImpact.basis}</span>
        </Tile>
      ) : null}
    </dl>
  );
}

export function CampaignHistory({ history }: { history: CampaignCardBlock["history"] }) {
  if (history.length === 0) return null;
  return (
    <div className="text-sm">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
        <Icon name="trophy" className="size-3.5 text-accent" />
        Campañas parecidas
      </p>
      <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
        {history.map((item) => (
          <li key={item.name} className="flex flex-wrap justify-between gap-x-3 px-3 py-2">
            <span>{item.name}</span>
            <span className="text-muted tabular-nums">
              lift {item.lift === null ? "sin dato" : `${item.lift} pts`} · n={item.n}
              {item.reliable ? "" : " · poco confiable"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
