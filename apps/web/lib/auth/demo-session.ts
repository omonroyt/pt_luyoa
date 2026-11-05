/**
 * ES: Sesión de la demo publicada (IMP-63, CA-S04). Al escribir un código de acceso válido,
 *     el servidor entrega una cookie firmada con HMAC que guarda el negocio, un id de sesión
 *     y su vencimiento; el proxy y las rutas la verifican sin consultar la base. La llave de
 *     firma se deriva de APPROVAL_SECRET con una etiqueta propia, así que una firma de
 *     sesión nunca sirve como firma de aprobación ni al revés.
 * EN: Published demo session (IMP-63, CA-S04). When a valid access code is entered, the
 *     server issues an HMAC-signed cookie holding the business, a session id and its expiry;
 *     the proxy and the routes verify it without querying the database. The signing key is
 *     derived from APPROVAL_SECRET with its own label, so a session signature never works
 *     as an approval signature or the other way around.
 */
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { BusinessConfig } from "../tenancy/business-registry";

export const SESSION_COOKIE = "alborada_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const SESSION_LABEL = "alborada/demo-session/v1";
const IP_LABEL = "alborada/demo-ip/v1";

export type DemoSession = { businessId: string; sessionId: string; expiresAt: number };

const derivedKey = (secret: string, label: string) =>
  createHmac("sha256", secret).update(label).digest();

const sign = (payload: string, secret: string) =>
  createHmac("sha256", derivedKey(secret, SESSION_LABEL)).update(payload).digest("base64url");

const digest = (value: string) => createHash("sha256").update(value).digest();

export function issueSession(businessId: string, secret: string, now = Date.now()) {
  const session: DemoSession = {
    businessId,
    sessionId: randomUUID(),
    expiresAt: now + SESSION_TTL_MS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return { session, value: `${payload}.${sign(payload, secret)}` };
}

function parsePayload(payload: string): DemoSession | null {
  try {
    const data: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const session = data as Partial<DemoSession>;
    if (typeof session.businessId !== "string" || typeof session.sessionId !== "string") {
      return null;
    }
    return typeof session.expiresAt === "number" ? (session as DemoSession) : null;
  } catch {
    return null;
  }
}

export function readSession(
  value: string | undefined,
  secret: string,
  now = Date.now(),
): DemoSession | null {
  const [payload, signature] = value?.split(".") ?? [];
  if (!payload || !signature) return null;
  if (!timingSafeEqual(digest(signature), digest(sign(payload, secret)))) return null;
  const session = parsePayload(payload);
  return session && session.expiresAt > now ? session : null;
}

/**
 * ES: La protección está activa si algún negocio tiene código de acceso. El código se
 *     compara contra todos los negocios, sin cortar al primer acierto, para que la latencia
 *     no revele cuál existe; los códigos son distintos entre negocios.
 * EN: Protection is on if any business has an access code. The code is compared against
 *     every business, without stopping at the first match, so latency does not reveal which
 *     one exists; codes differ across businesses.
 */
export const isDemoProtected = (businesses: BusinessConfig[]) =>
  businesses.some((business) => business.accessCode !== undefined);

export function businessForAccessCode(
  code: string,
  businesses: BusinessConfig[],
): BusinessConfig | undefined {
  const given = digest(code.trim());
  const matches = businesses.filter(
    (business) =>
      business.accessCode !== undefined && timingSafeEqual(given, digest(business.accessCode)),
  );
  return matches[0];
}

/**
 * ES: La IP se guarda como HMAC, nunca en claro: sirve para contar, no para identificar.
 * EN: The IP is stored as an HMAC, never in clear text: it is for counting, not identifying.
 */
export const hashIp = (ip: string, secret: string) =>
  createHmac("sha256", derivedKey(secret, IP_LABEL)).update(ip).digest("base64url").slice(0, 22);

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "desconocida";
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function sessionCookieHeader(value: string, secure: boolean): string {
  const attributes = [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  return (secure ? [...attributes, "Secure"] : attributes).join("; ");
}
