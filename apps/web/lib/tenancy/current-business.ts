/**
 * ES: Único lugar donde se decide a qué negocio pertenece una solicitud (X-05, ADR-16). El
 *     negocio sale siempre de una credencial del servidor, nunca de un dato que manda el
 *     navegador (encabezado, parámetro o cuerpo):
 *     - en /api/mcp, del token de servicio que llega;
 *     - en las rutas de la interfaz, del negocio por defecto. Con el código de acceso del
 *       despliegue (IMP-63), la sesión determinará el negocio.
 * EN: The single place where a request's business is decided (X-05, ADR-16). The business
 *     always comes from a server credential, never from data the browser sends (header,
 *     parameter or body):
 *     - in /api/mcp, from the incoming service token;
 *     - in the UI routes, from the default business. With the deployment access code
 *       (IMP-63), the session will determine the business.
 */
import { hasValidBearerToken } from "../auth/service-token";
import { serverConfig } from "../server-config";
import type { BusinessConfig } from "./business-registry";

export function currentBusiness(): BusinessConfig {
  const [first] = serverConfig().businesses;
  if (!first) throw new Error("No hay negocios registrados.");
  return first;
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
