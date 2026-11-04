import { ToolFailure } from "../errors";

/**
 * ES: Parámetros verificados contra la API real (docs/specs/05_DISENO_MCP.md §1.2).
 *     Un filtro que la API no reconoce se ignora en silencio y produce cifras falsas
 *     (por ejemplo, segment_id en /v1/customers devuelve todos los clientes), por eso
 *     solo se envían filtros de esta lista.
 * EN: Parameters verified against the real API (docs/specs/05_DISENO_MCP.md §1.2).
 *     A filter the API does not recognize is silently ignored and yields false figures
 *     (for example, segment_id on /v1/customers returns every customer), so only
 *     filters from this list are sent.
 */
const QUERY_WHITELIST: Record<string, readonly string[]> = {
  "/v1/business": [],
  "/v1/locations": [],
  "/v1/segments": [],
  "/v1/products": ["limit", "offset"],
  "/v1/campaigns": ["limit", "offset"],
  "/v1/customers": [
    "segment",
    "home_location_id",
    "inactive_days_min",
    "card_status",
    "tier",
    "limit",
    "offset",
  ],
  "/v1/analytics/sales": ["group_by", "from", "to", "location_id", "customer_type"],
  "/v1/analytics/visits": ["group_by", "from", "to", "location_id"],
  "/v1/campaigns/preview": [],
};

const DETAIL_PATHS = [
  /^\/v1\/customers\/[\w-]+$/,
  /^\/v1\/campaigns\/[\w-]+$/,
  /^\/v1\/campaigns\/[\w-]+\/send$/,
  /^\/v1\/transactions\/[\w-]+$/,
];

function allowedParamsFor(path: string): readonly string[] | undefined {
  if (path in QUERY_WHITELIST) return QUERY_WHITELIST[path];
  return DETAIL_PATHS.some((pattern) => pattern.test(path)) ? [] : undefined;
}

/**
 * ES: Rechaza endpoints o parámetros no verificados antes de llamar la API.
 * EN: Rejects unverified endpoints or parameters before calling the API.
 */
export function assertAllowedParams(path: string, paramNames: readonly string[]): void {
  const allowed = allowedParamsFor(path);
  if (!allowed) {
    throw new ToolFailure({ code: "validation_error", message: `Endpoint no permitido: ${path}` });
  }
  const rejected = paramNames.filter((name) => !allowed.includes(name));
  if (rejected.length > 0) {
    throw new ToolFailure({
      code: "validation_error",
      message: `Filtros no verificados para ${path}: ${rejected.join(", ")}`,
      suggestion: `Filtros permitidos: ${allowed.join(", ") || "ninguno"}`,
    });
  }
}
