/**
 * ES: Resolución de periodos a partir de data_as_of, el "hoy" del dataset (trampa T-01).
 *     El agente elige un preset o un rango y el código calcula las fechas exactas.
 * EN: Period resolution from data_as_of, the dataset "today" (pitfall T-01). The agent
 *     picks a preset or a range and the code computes the exact dates.
 */
import { ToolFailure } from "../errors";
import {
  addDays,
  addMonths,
  assertLocalDate,
  daysInclusive,
  endOfMonth,
  isLastDayOfMonth,
  startOfMonth,
} from "./dates";
import { monthLabel } from "./labels";

export const PERIOD_PRESETS = [
  "last_full_month",
  "previous_full_month",
  "last_week",
  "previous_week",
  "last_12_weeks",
  "previous_12_weeks",
  "last_3_months",
  "previous_3_months",
  "all_data",
] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number];
export type DateRange = { from: string; to: string };
export type PeriodInput = PeriodPreset | DateRange;
export type DataWindow = { dataFrom: string; dataAsOf: string };
export type ResolvedPeriod = DateRange & { days: number; label: string };

const WEEK_DAYS = 7;
const TWELVE_WEEKS_DAYS = 84;

function lastFullMonthStart(window: DataWindow): string {
  const asOfMonth = startOfMonth(window.dataAsOf);
  return isLastDayOfMonth(window.dataAsOf) ? asOfMonth : addMonths(asOfMonth, -1);
}

function monthsRange(firstMonth: string, count: number): DateRange {
  return { from: firstMonth, to: endOfMonth(addMonths(firstMonth, count - 1)) };
}

function trailingDays(endDate: string, days: number): DateRange {
  return { from: addDays(endDate, -(days - 1)), to: endDate };
}

function rangeLabel(range: DateRange): string {
  const isSingleMonth =
    range.from === startOfMonth(range.from) && range.to === endOfMonth(range.from);
  return isSingleMonth ? monthLabel(range.from) : `${range.from} a ${range.to}`;
}

const RESOLVERS: Record<PeriodPreset, (window: DataWindow) => DateRange> = {
  last_full_month: (w) => monthsRange(lastFullMonthStart(w), 1),
  previous_full_month: (w) => monthsRange(addMonths(lastFullMonthStart(w), -1), 1),
  last_week: (w) => trailingDays(w.dataAsOf, WEEK_DAYS),
  previous_week: (w) => trailingDays(addDays(w.dataAsOf, -WEEK_DAYS), WEEK_DAYS),
  last_12_weeks: (w) => trailingDays(w.dataAsOf, TWELVE_WEEKS_DAYS),
  previous_12_weeks: (w) =>
    trailingDays(addDays(w.dataAsOf, -TWELVE_WEEKS_DAYS), TWELVE_WEEKS_DAYS),
  last_3_months: (w) => monthsRange(addMonths(lastFullMonthStart(w), -2), 3),
  previous_3_months: (w) => monthsRange(addMonths(lastFullMonthStart(w), -5), 3),
  all_data: (w) => ({ from: w.dataFrom, to: w.dataAsOf }),
};

function assertInsideWindow(range: DateRange, window: DataWindow): void {
  const outside = range.from < window.dataFrom || range.to > window.dataAsOf;
  if (range.from > range.to || outside) {
    throw new ToolFailure({
      code: "validation_error",
      message: `El periodo ${range.from} a ${range.to} está fuera de los datos disponibles (${window.dataFrom} a ${window.dataAsOf}).`,
      suggestion: `Usar un periodo entre ${window.dataFrom} y ${window.dataAsOf}.`,
    });
  }
}

/**
 * ES: Convierte un preset o un rango en fechas exactas, validando que esté dentro de
 *     los datos disponibles.
 * EN: Converts a preset or a range into exact dates, validating it lies within the
 *     available data.
 */
export function resolvePeriod(input: PeriodInput, window: DataWindow): ResolvedPeriod {
  const range =
    typeof input === "string"
      ? RESOLVERS[input](window)
      : { from: assertLocalDate(input.from), to: assertLocalDate(input.to) };
  assertInsideWindow(range, window);
  return { ...range, days: daysInclusive(range.from, range.to), label: rangeLabel(range) };
}

/**
 * ES: Calendario completo que se entrega al agente: cada preset ya resuelto y el
 *     primer día en que puede iniciar una oferta (posterior a data_as_of).
 * EN: Full calendar handed to the agent: every preset already resolved and the first
 *     day an offer may start (after data_as_of).
 */
export function buildCalendar(window: DataWindow) {
  const presets = Object.fromEntries(
    PERIOD_PRESETS.map((preset) => [preset, resolvePeriod(preset, window)]),
  ) as Record<PeriodPreset, ResolvedPeriod>;
  return { ...window, presets, firstOfferDate: addDays(window.dataAsOf, 1) };
}
