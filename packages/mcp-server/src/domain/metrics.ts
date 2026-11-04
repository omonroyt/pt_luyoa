/**
 * ES: Cálculos numéricos que el agente nunca hace por su cuenta (ADR-09).
 * EN: Numeric calculations the agent never performs on its own (ADR-09).
 */

export type Delta = {
  absolute: number;
  percent: number | null;
};

export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * ES: Variación absoluta y porcentual (un decimal). El porcentaje es null cuando el
 *     valor anterior es 0, porque no existe una variación porcentual válida.
 * EN: Absolute and percentage change (one decimal). The percentage is null when the
 *     previous value is 0, because no valid percentage change exists.
 */
export function delta(current: number, previous: number): Delta {
  return {
    absolute: roundTo(current - previous),
    percent: previous === 0 ? null : roundTo(((current - previous) / previous) * 100, 1),
  };
}

export function perDay(value: number, days: number): number {
  return days > 0 ? roundTo(value / days) : 0;
}

export function sharePercent(part: number, total: number): number {
  return total === 0 ? 0 : roundTo((part / total) * 100, 1);
}

export function sumBy<T>(rows: readonly T[], pick: (row: T) => number | undefined): number {
  return roundTo(rows.reduce((total, row) => total + (pick(row) ?? 0), 0));
}

export function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : roundTo(numerator / denominator);
}
