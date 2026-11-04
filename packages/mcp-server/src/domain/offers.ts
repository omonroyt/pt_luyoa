/**
 * ES: Economía de una oferta: cuánto cuesta cada canje y qué parte de la utilidad de una
 *     visita consume (bonus B-04). Cada supuesto queda escrito en la salida.
 * EN: Offer economics: what each redemption costs and how much of a visit's profit it
 *     consumes (bonus B-04). Every assumption is written into the output.
 */
import type { Product } from "../api/schemas";
import { ToolFailure } from "../errors";
import { roundTo, sharePercent } from "./metrics";

export type OfferInput = { type: string; value?: number; product_id?: string };

export type OfferBaseline = {
  avgTicket: number;
  grossMargin: number;
};

const POINTS_PER_PESO = 0.1;
const REWARD_POINTS = 150;
const REWARD_VALUE_MXN = 68;
const MAX_PERCENT_OFF = 100;

/**
 * ES: Valida los campos obligatorios de la oferta y devuelve el producto si aplica.
 * EN: Validates the offer's required fields and returns the product when applicable.
 */
export function resolveOfferProduct(
  offer: OfferInput,
  products: readonly Product[],
): Product | undefined {
  const needsProduct = offer.type === "free_item" || offer.type === "two_for_one";
  if (!needsProduct) {
    const isValidValue =
      offer.value !== undefined &&
      (offer.type === "percent_off" ? offer.value <= MAX_PERCENT_OFF : offer.value > 1);
    if (!isValidValue) {
      throw new ToolFailure({
        code: "validation_error",
        message: `La oferta ${offer.type} requiere un value válido.`,
        suggestion:
          "percent_off: porcentaje entre 1 y 100; points_multiplier: multiplicador mayor que 1.",
      });
    }
    return undefined;
  }
  const product = products.find((candidate) => candidate.id === offer.product_id);
  if (!product) {
    throw new ToolFailure({
      code: "validation_error",
      message: `La oferta ${offer.type} requiere un product_id existente (recibido: ${offer.product_id ?? "ninguno"}).`,
      suggestion: `Productos válidos: ${products.map((candidate) => candidate.id).join(", ")}.`,
    });
  }
  return product;
}

type CostBreakdown = { cost: number; basis: string; assumptions: string[] };

function costPerRedemption(
  offer: OfferInput,
  product: Product | undefined,
  baseline: OfferBaseline,
): CostBreakdown {
  const value = offer.value ?? 0;
  if (product && offer.type === "free_item") {
    return {
      cost: product.unit_cost,
      basis: `Costo unitario de ${product.name} regalado ($${product.unit_cost}).`,
      assumptions: [],
    };
  }
  if (product) {
    return {
      cost: product.unit_cost,
      basis: `Costo unitario del segundo ${product.name} ($${product.unit_cost}).`,
      assumptions: [],
    };
  }
  if (offer.type === "percent_off") {
    return {
      cost: roundTo((baseline.avgTicket * value) / 100),
      basis: `${value}% sobre el ticket promedio de $${baseline.avgTicket}.`,
      assumptions: [
        "El descuento se aplica al ticket completo; el costo es ingreso que se deja de cobrar.",
      ],
    };
  }
  const extraPoints = (value - 1) * baseline.avgTicket * POINTS_PER_PESO;
  return {
    cost: roundTo((extraPoints * REWARD_VALUE_MXN) / REWARD_POINTS),
    basis: `${roundTo(extraPoints)} puntos extra por ticket promedio de $${baseline.avgTicket}.`,
    assumptions: [
      `Cada punto se valúa hasta $${roundTo(REWARD_VALUE_MXN / REWARD_POINTS)} (bebida de $${REWARD_VALUE_MXN} por ${REWARD_POINTS} puntos); el costo se difiere hasta el canje.`,
    ],
  };
}

/**
 * ES: Costo por canje, utilidad promedio de una visita y margen restante.
 * EN: Cost per redemption, average visit profit and remaining margin.
 */
export function computeOfferEconomics(
  offer: OfferInput,
  product: Product | undefined,
  baseline: OfferBaseline,
) {
  const breakdown = costPerRedemption(offer, product, baseline);
  const visitGrossProfit = roundTo(baseline.avgTicket * baseline.grossMargin);
  return {
    cost_per_redemption: breakdown.cost,
    visit_gross_profit: visitGrossProfit,
    margin_after_offer: roundTo(visitGrossProfit - breakdown.cost),
    cost_share_of_visit_profit: sharePercent(breakdown.cost, visitGrossProfit),
    basis: breakdown.basis,
    assumptions: [
      `Ticket promedio $${baseline.avgTicket} y margen bruto ${roundTo(baseline.grossMargin * 100, 1)}% de los últimos 3 meses.`,
      ...breakdown.assumptions,
    ],
  };
}

export type OfferEconomics = ReturnType<typeof computeOfferEconomics>;
