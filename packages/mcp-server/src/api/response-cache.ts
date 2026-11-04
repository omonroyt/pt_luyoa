export type ResponseCache = {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  has(key: string): boolean;
};

/**
 * ES: Caché en memoria por proceso. El dataset es estático hasta data_as_of, así que
 *     una respuesta no cambia durante la sesión; se vacía al reiniciar el proceso.
 * EN: Per-process in-memory cache. The dataset is static up to data_as_of, so a
 *     response does not change during the session; it is cleared on restart.
 */
export function createResponseCache(): ResponseCache {
  const entries = new Map<string, unknown>();
  return {
    get: (key) => entries.get(key),
    set: (key, value) => void entries.set(key, value),
    has: (key) => entries.has(key),
  };
}
