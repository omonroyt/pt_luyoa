/**
 * ES: Fechas de los escenarios calculadas desde data_as_of. Se reimplementan aquí, sin
 *     reutilizar el dominio del MCP, para que la referencia sea independiente.
 * EN: Scenario dates computed from data_as_of. They are reimplemented here, without
 *     reusing the MCP domain, so the reference stays independent.
 */

const MS_PER_DAY = 86_400_000;

const toDate = (value: string) => new Date(`${value}T00:00:00Z`);
const toText = (date: Date) => date.toISOString().slice(0, 10);

export const shiftDays = (value: string, days: number) =>
  toText(new Date(toDate(value).getTime() + days * MS_PER_DAY));

export function monthBounds(year: number, monthIndex: number) {
  return {
    from: toText(new Date(Date.UTC(year, monthIndex, 1))),
    to: toText(new Date(Date.UTC(year, monthIndex + 1, 0))),
  };
}

export const daysBetween = (from: string, to: string) =>
  Math.round((toDate(to).getTime() - toDate(from).getTime()) / MS_PER_DAY) + 1;

/**
 * ES: Rangos usados por los escenarios. data_as_of = 2026-10-31 (fin de mes), así que el
 *     último mes completo es el mes de data_as_of.
 * EN: Ranges used by the scenarios. data_as_of = 2026-10-31 (end of month), so the last
 *     full month is the data_as_of month.
 */
export function scenarioRanges(dataAsOf: string) {
  const asOf = toDate(dataAsOf);
  const isMonthEnd = toText(new Date(asOf.getTime() + MS_PER_DAY)).endsWith("-01");
  const lastMonthIndex = asOf.getUTCMonth() - (isMonthEnd ? 0 : 1);
  const year = asOf.getUTCFullYear();
  return {
    lastFullMonth: monthBounds(year, lastMonthIndex),
    previousFullMonth: monthBounds(year, lastMonthIndex - 1),
    last12Weeks: { from: shiftDays(dataAsOf, -83), to: dataAsOf },
    previous12Weeks: { from: shiftDays(dataAsOf, -167), to: shiftDays(dataAsOf, -84) },
    last3Months: {
      from: monthBounds(year, lastMonthIndex - 2).from,
      to: monthBounds(year, lastMonthIndex).to,
    },
    firstOfferDate: shiftDays(dataAsOf, 1),
  };
}
