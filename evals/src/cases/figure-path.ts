/**
 * ES: Resuelve una ruta de cifra dentro de una respuesta de referencia, p. ej.
 *     "by_weekday[1].transactions_per_day" o "current.net_sales".
 * EN: Resolves a figure path inside a reference answer, e.g.
 *     "by_weekday[1].transactions_per_day" or "current.net_sales".
 */
const SEGMENT = /([^.[\]]+)|\[(\d+)\]/g;

export function figureAt(figures: unknown, path: string): unknown {
  const keys = [...path.matchAll(SEGMENT)].map((match) => match[1] ?? Number(match[2]));
  return keys.reduce<unknown>(
    (current, key) => (current as Record<string | number, unknown> | undefined)?.[key],
    figures,
  );
}
