export type RateLimiter = {
  schedule<T>(task: () => Promise<T>): Promise<T>;
};

export type RateLimiterOptions = {
  maxPerMinute: number;
  maxConcurrent: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

const WINDOW_MS = 60_000;
const POLL_INTERVAL_MS = 25;

export const realSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ES: Limita las solicitudes a la API: máximo por minuto (ventana deslizante) y
 *     máximo en paralelo. La API no publica cabeceras de límite, así que el MCP
 *     lleva su propia cuenta para no recibir 429.
 * EN: Limits API requests: maximum per minute (sliding window) and maximum in
 *     parallel. The API does not publish rate-limit headers, so the MCP keeps its
 *     own count to avoid 429 responses.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? realSleep;
  const startedAt: number[] = [];
  let active = 0;

  const hasCapacity = (): boolean => {
    while (startedAt.length > 0 && now() - (startedAt[0] ?? 0) >= WINDOW_MS) startedAt.shift();
    return active < options.maxConcurrent && startedAt.length < options.maxPerMinute;
  };

  const acquire = async (): Promise<void> => {
    while (!hasCapacity()) await sleep(POLL_INTERVAL_MS);
    active += 1;
    startedAt.push(now());
  };

  return {
    async schedule(task) {
      await acquire();
      try {
        return await task();
      } finally {
        active -= 1;
      }
    },
  };
}
