/**
 * ES: Formatos de la interfaz (07 §5): pesos con Intl es-MX sin centavos salvo montos
 *     menores a mil (como el ticket promedio), porcentajes con un decimal y variaciones
 *     con signo. La interfaz solo da formato: nunca calcula cifras.
 * EN: UI formats (07 §5): pesos with Intl es-MX without cents except amounts under one
 *     thousand (such as the average ticket), percentages with one decimal and signed
 *     changes. The UI only formats: it never computes figures.
 */
import type { Period, Unit } from "@alborada/shared";

const SMALL_AMOUNT = 1000;
const MINUS = "−";

const mxn = (decimals: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
const number = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });

export function formatMxn(value: number): string {
  const showCents = !Number.isInteger(value) && Math.abs(value) < SMALL_AMOUNT;
  return mxn(showCents ? 2 : 0).format(value);
}

export function formatValue(value: number | string | null | undefined, unit?: Unit): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (unit === "mxn") return formatMxn(value);
  if (unit === "percent") return `${value.toFixed(1)}%`;
  if (unit === "ratio") return number.format(value);
  return number.format(value);
}

function signOf(value: number): string {
  if (value > 0) return "+";
  if (value < 0) return MINUS;
  return "";
}

export function formatDelta(percent: number): string {
  return `${signOf(percent)}${Math.abs(percent).toFixed(1)}%`;
}

export function formatPeriod(period: Period): string {
  const range = period.from === period.to ? period.from : `${period.from} a ${period.to}`;
  return period.label && period.label !== range ? `${period.label} · ${range}` : range;
}

/**
 * ES: Dirección de una variación para colorearla y anunciarla; el color nunca es la única
 *     señal (07 §5).
 * EN: Direction of a change to color and announce it; color is never the only cue (07 §5).
 */
export function deltaTone(percent: number, goodWhen?: "up" | "down"): "good" | "bad" | "neutral" {
  if (percent === 0 || !goodWhen) return "neutral";
  const up = percent > 0;
  return up === (goodWhen === "up") ? "good" : "bad";
}
