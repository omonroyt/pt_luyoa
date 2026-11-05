/**
 * ES: Único lugar donde se decide a qué negocio pertenece una solicitud (X-05, ADR-16). El
 *     negocio sale siempre de una credencial del servidor, nunca de un dato que manda el
 *     navegador (encabezado, parámetro o cuerpo):
 *     - en /api/mcp, del token de servicio que llega;
 *     - en las rutas de la interfaz, de la sesión firmada que entregó el código de acceso
 *       (IMP-63). Sin códigos configurados (desarrollo local) se usa el negocio por defecto.
 * EN: The single place where a request's business is decided (X-05, ADR-16). The business
 *     always comes from a server credential, never from data the browser sends (header,
 *     parameter or body):
 *     - in /api/mcp, from the incoming service token;
 *     - in the UI routes, from the signed session issued by the access code (IMP-63).
 *       Without configured codes (local development) the default business is used.
 */
import {
  isDemoProtected,
  readCookie,
  readSession,
  SESSION_COOKIE,
  type DemoSession,
} from "../auth/demo-session";
import { hasValidBearerToken } from "../auth/service-token";
import { serverConfig, type ServerConfig } from "../server-config";
import type { BusinessConfig } from "./business-registry";

export type RequestBusiness = { business: BusinessConfig; session: DemoSession | null };

export function businessForRequest(
  request: Request,
  config: Pick<ServerConfig, "businesses" | "approvalSecret"> = serverConfig(),
): RequestBusiness | undefined {
  const [first] = config.businesses;
  if (!first) throw new Error("No hay negocios registrados.");
  if (!isDemoProtected(config.businesses)) return { business: first, session: null };
  const session = readSession(readCookie(request, SESSION_COOKIE), config.approvalSecret);
  const business = config.businesses.find(
    (candidate) => candidate.id === session?.businessId && candidate.accessCode !== undefined,
  );
  return business && session ? { business, session } : undefined;
}

export function currentBusiness(request: Request): BusinessConfig | undefined {
  return businessForRequest(request)?.business;
}

/**
 * ES: El token se compara contra todos los negocios, sin cortar al primer acierto, para que
 *     la latencia no indique cuál existe. Los tokens son distintos entre negocios, así que
 *     a lo más coincide uno.
 * EN: The token is compared against every business, without stopping at the first match,
 *     so latency does not reveal which one exists. Tokens differ across businesses, so at
 *     most one matches.
 */
export function businessForServiceToken(
  request: Request,
  businesses: BusinessConfig[] = serverConfig().businesses,
): BusinessConfig | undefined {
  const matches = businesses.filter((business) =>
    hasValidBearerToken(request, business.mcpServiceToken),
  );
  return matches[0];
}

/**
 * ES: Respuesta de las rutas de la interfaz cuando no hay una sesión válida.
 * EN: UI route response when there is no valid session.
 */
export const sessionRequiredResponse = () =>
  Response.json(
    {
      error: {
        code: "unauthorized",
        message: "Tu sesión de la demo venció. Vuelve a entrar con el código de acceso.",
      },
    },
    { status: 401 },
  );
