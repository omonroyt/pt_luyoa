/**
 * ES: Reintento de un caso cuando la API de Café Alborada responde "Demasiadas
 *     solicitudes" (rate_limited) al iniciar el turno. Es una falla de infraestructura de
 *     la corrida, no del modelo: en la corrida completa de M6, la mitad de los casos de un
 *     modelo rápido fallaron así. Se espera un minuto, como pide la API, y se reintenta.
 * EN: Retries a case when the Café Alborada API answers "Too many requests"
 *     (rate_limited) at the start of the turn. It is a run infrastructure failure, not the
 *     model's: in the M6 full run, half the cases of a fast model failed this way. It
 *     waits one minute, as the API asks, and retries.
 */
export const RATE_LIMIT_WAIT_MS = 60_000;
export const RATE_LIMIT_RETRIES = 2;

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const isRateLimited = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).includes("rate_limited");

export async function retryRateLimited<T>(
  run: () => Promise<T>,
  wait: (ms: number) => Promise<void> = pause,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= RATE_LIMIT_RETRIES || !isRateLimited(error)) throw error;
      console.log(
        `Límite de la API alcanzado; se espera ${RATE_LIMIT_WAIT_MS / 1000} s y se reintenta.`,
      );
      await wait(RATE_LIMIT_WAIT_MS);
    }
  }
}
