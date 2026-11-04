import { errorCodeFromStatus, type ToolErrorCode } from "@alborada/shared";
import type { z } from "zod";
import { ToolFailure } from "../errors";
import { assertAllowedParams } from "./filters";
import { createRateLimiter, realSleep, type RateLimiter } from "./rate-limiter";
import { createResponseCache, type ResponseCache } from "./response-cache";

export type QueryParams = Record<string, string | number | undefined>;
export type ApiResponse<T> = { data: T; endpoint: string };

export type ApiClient = {
  get<T>(path: string, schema: z.ZodType<T>, params?: QueryParams): Promise<ApiResponse<T>>;
  post<T>(path: string, schema: z.ZodType<T>, body: unknown): Promise<ApiResponse<T>>;
};

export type ApiClientOptions = {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  limiter?: RateLimiter;
  cache?: ResponseCache;
  sleep?: (ms: number) => Promise<void>;
  retryBudgetMs?: number;
};

type ApiRequest = { method: "GET" | "POST"; path: string; query: string; body?: unknown };

const MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_BUDGET_MS = 10_000;
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_AFTER_SECONDS = 1;
const RETRYABLE_CODES: readonly ToolErrorCode[] = ["rate_limited", "busy", "upstream_error"];
const CACHEABLE_POSTS = new Set(["/v1/campaigns/preview"]);

const SUGGESTIONS: Partial<Record<ToolErrorCode, string>> = {
  unauthorized: "Revisar la llave LUYOA_API_KEY configurada en el servidor.",
  not_found: "Verificar el identificador; usar un id devuelto por otra herramienta.",
  validation_error: "Corregir el parámetro con uno de los valores válidos que indica el mensaje.",
  conflict: "Consultar el estado actual del recurso antes de repetir la acción.",
  rate_limited: "Esperar unos segundos y reintentar.",
  busy: "La API está saturada; reintentar en unos segundos o responder con lo ya obtenido.",
};

function buildQuery(params: QueryParams = {}): string {
  const entries = Object.entries(params)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return new URLSearchParams(entries.map(([key, value]) => [key, String(value)])).toString();
}

function describe(request: ApiRequest): string {
  return `${request.method} ${request.path}${request.query ? `?${request.query}` : ""}`;
}

function retryAfterMs(response: Response): number {
  const seconds = Number(response.headers.get("retry-after") ?? DEFAULT_RETRY_AFTER_SECONDS);
  return (Number.isFinite(seconds) ? seconds : DEFAULT_RETRY_AFTER_SECONDS) * 1000;
}

/**
 * ES: Traduce una respuesta de error de la API a ToolFailure. El mensaje de la API
 *     se conserva (lista los valores válidos en los 422), salvo en 401 para no
 *     dar pistas sobre la llave.
 * EN: Maps an API error response to a ToolFailure. The API message is kept (it lists
 *     valid values on 422 responses), except on 401 to avoid hinting at the key.
 */
async function toFailure(response: Response): Promise<ToolFailure> {
  const body = (await response.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string };
  };
  const code = errorCodeFromStatus(response.status, body.error?.code);
  const message =
    code === "unauthorized"
      ? "La API rechazó la llave configurada."
      : (body.error?.message ?? `La API respondió con estado ${response.status}.`);
  return new ToolFailure({
    code,
    message,
    retryable: RETRYABLE_CODES.includes(code),
    suggestion: SUGGESTIONS[code],
  });
}

function networkFailure(): ToolFailure {
  return new ToolFailure({
    code: "upstream_error",
    message: "La API no respondió a tiempo.",
    retryable: true,
    suggestion: SUGGESTIONS.busy,
  });
}

/**
 * ES: Crea el cliente de la API de Café Alborada: lista blanca de filtros, caché,
 *     limitador, reintentos de 429/503 dentro de un presupuesto de espera y
 *     validación del esquema de cada respuesta.
 * EN: Creates the Café Alborada API client: filter whitelist, cache, rate limiter,
 *     429/503 retries within a waiting budget and schema validation of every response.
 */
type Transport = {
  baseUrl: string;
  apiKey: string;
  fetchImpl: typeof fetch;
  limiter: RateLimiter;
  sleep: (ms: number) => Promise<void>;
  retryBudgetMs: number;
};

function fetchOnce(transport: Transport, request: ApiRequest): Promise<Response> {
  const url = `${transport.baseUrl}${request.path}${request.query ? `?${request.query}` : ""}`;
  return transport.limiter
    .schedule(() =>
      transport.fetchImpl(url, {
        method: request.method,
        headers: { "X-API-Key": transport.apiKey, "Content-Type": "application/json" },
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }),
    )
    .catch(() => {
      throw networkFailure();
    });
}

/**
 * ES: Ejecuta la solicitud reintentando 429/503 mientras la espera acumulada quepa en
 *     el presupuesto.
 * EN: Runs the request retrying 429/503 while the accumulated wait fits the budget.
 */
async function executeWithRetries(transport: Transport, request: ApiRequest): Promise<unknown> {
  let waitedMs = 0;
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetchOnce(transport, request);
    if (response.ok) return response.json();
    const failure = await toFailure(response);
    const waitMs = retryAfterMs(response);
    const canRetry =
      failure.retryable && attempt < MAX_ATTEMPTS && waitedMs + waitMs <= transport.retryBudgetMs;
    if (!canRetry) throw failure;
    await transport.sleep(waitMs);
    waitedMs += waitMs;
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const cache = options.cache ?? createResponseCache();
  const transport: Transport = {
    baseUrl: options.baseUrl,
    apiKey: options.apiKey,
    fetchImpl: options.fetchImpl ?? fetch,
    limiter: options.limiter ?? createRateLimiter({ maxPerMinute: 120, maxConcurrent: 6 }),
    sleep: options.sleep ?? realSleep,
    retryBudgetMs: options.retryBudgetMs ?? DEFAULT_RETRY_BUDGET_MS,
  };
  const execute = (request: ApiRequest) => executeWithRetries(transport, request);

  const request = async <T>(apiRequest: ApiRequest, schema: z.ZodType<T>, cacheable: boolean) => {
    const endpoint = describe(apiRequest);
    const cacheKey = `${endpoint} ${JSON.stringify(apiRequest.body ?? null)}`;
    const raw = cacheable && cache.has(cacheKey) ? cache.get(cacheKey) : await execute(apiRequest);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new ToolFailure({
        code: "upstream_error",
        message: `La API respondió con un formato inesperado en ${apiRequest.path}.`,
      });
    }
    if (cacheable) cache.set(cacheKey, raw);
    return { data: parsed.data, endpoint };
  };

  return {
    async get(path, schema, params = {}) {
      assertAllowedParams(path, Object.keys(params));
      return request({ method: "GET", path, query: buildQuery(params) }, schema, true);
    },
    async post(path, schema, body) {
      assertAllowedParams(path, []);
      const isRead = CACHEABLE_POSTS.has(path);
      try {
        return await request({ method: "POST", path, query: "", body }, schema, isRead);
      } finally {
        // ES: Una escritura cambia el estado de la API: se descarta todo lo cacheado.
        // EN: A write changes the API state: everything cached is discarded.
        if (!isRead) cache.clear();
      }
    },
  };
}
