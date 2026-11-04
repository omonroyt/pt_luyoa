/**
 * ES: Clave única de una solicitud (método, ruta, parámetros ordenados y cuerpo).
 *     La usan el grabador de fixtures y la API falsa, para que siempre coincidan.
 * EN: Unique request key (method, path, sorted parameters and body). Used by the
 *     fixture recorder and the fake API so they always match.
 */
export function fixtureKey(method: string, url: URL, body?: string): string {
  const params = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  const query = new URLSearchParams(params).toString();
  const normalizedBody = body ? JSON.stringify(JSON.parse(body)) : "";
  return `${method.toUpperCase()} ${url.pathname}${query ? `?${query}` : ""} ${normalizedBody}`.trim();
}

export type RecordedResponse = { status: number; body: unknown };
export type FixtureFile = Record<string, RecordedResponse>;
