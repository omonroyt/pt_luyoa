/**
 * ES: Impacto esperado de una campaña antes de enviarla (extra X-03), siempre como rango.
 *     Con una campaña de referencia con grupo de control, el rango sale del intervalo de
 *     confianza de su lift; sin control solo se estiman canjes, no visitas incrementales.
 * EN: Expected impact of a campaign before sending it (extra X-03), always as a range.
 *     With a reference campaign that had a control group, the range comes from its lift
 *     confidence interval; without control only redemptions are estimated, not
 *     incremental visits.
 */
import { roundTo } from "./metrics";

export type ImpactInput = {
  reachable: number;
  liftInterval: { low: number; mid: number; high: number } | null;
  redemptionRates: readonly number[];
  avgTicket: number;
  visitGrossProfit: number;
  costPerRedemption: number;
};

type Range = [number, number, number];

const scale = (rates: Range, factor: number): Range =>
  rates.map((rate) => roundTo(rate * factor)) as Range;

function redemptionRange(rates: readonly number[]): Range {
  if (rates.length === 0) return [0, 0, 0];
  const sorted = [...rates].sort((a, b) => a - b);
  const average = sorted.reduce((sum, rate) => sum + rate, 0) / sorted.length;
  return [sorted[0] ?? 0, average, sorted.at(-1) ?? 0];
}

/**
 * ES: Utilidad neta conservadora: el escenario bajo combina la menor utilidad extra con
 *     el mayor costo de oferta, y el alto lo contrario.
 * EN: Conservative net profit: the low scenario pairs the lowest extra profit with the
 *     highest offer cost, and the high scenario the opposite.
 */
function conservativeNet(extraGrossProfit: Range, offerCost: Range): Range {
  return [
    roundTo(extraGrossProfit[0] - offerCost[2]),
    roundTo(extraGrossProfit[1] - offerCost[1]),
    roundTo(extraGrossProfit[2] - offerCost[0]),
  ];
}

export function estimateImpact(input: ImpactInput) {
  const redemptions = scale(redemptionRange(input.redemptionRates), input.reachable).map(
    Math.round,
  ) as Range;
  const offerCost = scale(redemptions, input.costPerRedemption);
  if (!input.liftInterval) {
    return {
      kind: "redemptions_only" as const,
      expected_redemptions: redemptions,
      offer_cost: offerCost,
      confidence: "baja" as const,
    };
  }
  const { low, mid, high } = input.liftInterval;
  const extraVisits = scale([low, mid, high], input.reachable).map(Math.round) as Range;
  const extraNetSales = scale(extraVisits, input.avgTicket);
  const extraGrossProfit = scale(extraVisits, input.visitGrossProfit);
  return {
    kind: "incremental" as const,
    extra_visits: extraVisits,
    extra_net_sales: extraNetSales,
    expected_redemptions: redemptions,
    offer_cost: offerCost,
    net_gross_profit: conservativeNet(extraGrossProfit, offerCost),
    confidence: "media" as const,
  };
}
