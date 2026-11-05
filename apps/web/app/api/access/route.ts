/**
 * ES: Entrada a la demo publicada (IMP-63, CA-S04). Recibe el código de acceso, lo compara
 *     en tiempo constante contra el de cada negocio y, si coincide, entrega la cookie de
 *     sesión firmada que fija el negocio. Los intentos por IP están limitados al día, y la
 *     respuesta a un código incorrecto no dice si algún negocio existe.
 * EN: Published demo entry (IMP-63, CA-S04). It receives the access code, compares it in
 *     constant time against each business's code and, on a match, issues the signed session
 *     cookie that fixes the business. Attempts per IP are capped per day, and the answer to
 *     a wrong code does not reveal whether any business exists.
 */
import { z } from "zod";
import {
  businessForAccessCode,
  clientIp,
  hashIp,
  isDemoProtected,
  issueSession,
  sessionCookieHeader,
} from "@/lib/auth/demo-session";
import { isSameOrigin } from "@/lib/auth/service-token";
import { getDatabase } from "@/lib/db/client";
import { checkAccessAttempt, demoLimits } from "@/lib/demo/demo-limits";
import { serverConfig } from "@/lib/server-config";

const AccessRequest = z.object({ code: z.string().min(1).max(200) });

const errorResponse = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return errorResponse(403, "forbidden", "Origen no permitido.");
  const config = serverConfig();
  if (!isDemoProtected(config.businesses)) {
    return errorResponse(404, "not_found", "La demo no requiere código de acceso.");
  }
  const parsed = AccessRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse(400, "validation_error", "Escribe el código.");
  const ipHash = hashIp(clientIp(request), config.approvalSecret);
  const allowed = await checkAccessAttempt(await getDatabase(), { ipHash, limits: demoLimits() });
  if (!allowed) {
    return errorResponse(429, "rate_limited", "Demasiados intentos. Vuelve a intentarlo mañana.");
  }
  const business = businessForAccessCode(parsed.data.code, config.businesses);
  if (!business) return errorResponse(401, "invalid_code", "El código no es válido.");
  const { value } = issueSession(business.id, config.approvalSecret);
  const secure = new URL(request.url).protocol === "https:";
  return Response.json(
    { ok: true, business: business.name },
    { headers: { "Set-Cookie": sessionCookieHeader(value, secure) } },
  );
}
