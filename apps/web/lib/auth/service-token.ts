/**
 * ES: Valida el token de servicio del endpoint MCP (Authorization: Bearer). La
 *     comparación es de tiempo constante para no filtrar información por la latencia.
 * EN: Validates the MCP endpoint service token (Authorization: Bearer). The comparison
 *     is constant-time so latency does not leak information.
 */
import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string) => createHash("sha256").update(value).digest();

export function hasValidBearerToken(request: Request, expectedToken: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return false;
  return timingSafeEqual(digest(token), digest(expectedToken));
}

/**
 * ES: Acepta solo solicitudes del mismo origen (protección CSRF) cuando el navegador
 *     envía el encabezado Origin.
 * EN: Accepts only same-origin requests (CSRF protection) when the browser sends the
 *     Origin header.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(request.url).origin;
}
