/**
 * ES: Puerta de la demo publicada (IMP-63, CA-S04). Cuando algún negocio tiene código de
 *     acceso, toda página y ruta de la interfaz exige la sesión firmada: sin ella, las
 *     páginas llevan a /acceso y las rutas de la API responden 401. Quedan abiertas la
 *     entrada, la salud del servicio y las rutas que se protegen con su propio token
 *     (/api/mcp y el cron). Sin códigos configurados (desarrollo local) no hace nada.
 * EN: Published demo gate (IMP-63, CA-S04). When any business has an access code, every UI
 *     page and route requires the signed session: without it, pages go to /acceso and API
 *     routes answer 401. The entry, the health check and the routes protected by their own
 *     token (/api/mcp and the cron) stay open. Without configured codes (local
 *     development) it does nothing.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isDemoProtected } from "@/lib/auth/demo-session";
import { serverConfig } from "@/lib/server-config";
import { businessForRequest, sessionRequiredResponse } from "@/lib/tenancy/current-business";

const OPEN_PATHS = ["/acceso", "/api/access", "/api/health", "/api/mcp", "/api/cron/weekly"];

const isOpen = (pathname: string) =>
  OPEN_PATHS.some((open) => pathname === open || pathname.startsWith(`${open}/`));

export function proxy(request: NextRequest) {
  const settings = serverConfig();
  if (!isDemoProtected(settings.businesses)) return NextResponse.next();
  const { pathname } = request.nextUrl;
  if (isOpen(pathname) || businessForRequest(request, settings)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return sessionRequiredResponse();
  return NextResponse.redirect(new URL("/acceso", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand/|icon.png|favicon.ico).*)"],
};
