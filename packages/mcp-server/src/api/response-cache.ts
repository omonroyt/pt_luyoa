export type ResponseCache = {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  has(key: string): boolean;
  clear(): void;
};

/**
 * ES: Caché en memoria por proceso. Los datos históricos son estáticos hasta data_as_of;
 *     las escrituras (crear o enviar campañas) vacían la caché para que las consultas
 *     siguientes vean el estado nuevo.
 * EN: Per-process in-memory cache. Historical data is static up to data_as_of; writes
 *     (creating or sending campaigns) clear the cache so later queries see the new state.
 */
export function createResponseCache(): ResponseCache {
  const entries = new Map<string, unknown>();
  return {
    get: (key) => entries.get(key),
    set: (key, value) => void entries.set(key, value),
    has: (key) => entries.has(key),
    clear: () => entries.clear(),
  };
}
