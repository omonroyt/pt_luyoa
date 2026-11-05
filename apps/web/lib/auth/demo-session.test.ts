import { describe, expect, it } from "vitest";
import type { BusinessConfig } from "../tenancy/business-registry";
import {
  businessForAccessCode,
  clientIp,
  hashIp,
  isDemoProtected,
  issueSession,
  readCookie,
  readSession,
  SESSION_TTL_MS,
  sessionCookieHeader,
} from "./demo-session";

const SECRET = "s".repeat(40);
const NOW = Date.UTC(2026, 10, 5, 18);

const business = (id: string, accessCode?: string): BusinessConfig => ({
  id,
  name: id,
  apiKey: `llave-${id}`,
  mcpServiceToken: `${id}-`.padEnd(40, "t"),
  ...(accessCode ? { accessCode } : {}),
});

describe("sesión de la demo (IMP-63)", () => {
  it("una sesión emitida se lee con su negocio hasta que vence", () => {
    const { value, session } = issueSession("biz_alborada", SECRET, NOW);
    expect(readSession(value, SECRET, NOW + 1000)).toEqual(session);
    expect(readSession(value, SECRET, NOW + SESSION_TTL_MS + 1)).toBeNull();
  });

  it("rechaza una cookie alterada, firmada con otro secreto o mal formada", () => {
    const { value } = issueSession("biz_alborada", SECRET, NOW);
    const [payload, signature] = value.split(".");
    const forged = Buffer.from(
      JSON.stringify({ businessId: "biz_norte", sessionId: "x", expiresAt: NOW + 9e9 }),
    ).toString("base64url");
    expect(readSession(`${forged}.${signature}`, SECRET, NOW)).toBeNull();
    expect(readSession(`${payload}.${signature}`, "o".repeat(40), NOW)).toBeNull();
    expect(readSession("basura", SECRET, NOW)).toBeNull();
    expect(readSession(undefined, SECRET, NOW)).toBeNull();
  });

  it("el código de acceso elige el negocio y la protección se activa con cualquier código", () => {
    const businesses = [business("biz_alborada", "codigo-alborada"), business("biz_norte")];
    expect(isDemoProtected(businesses)).toBe(true);
    expect(isDemoProtected([business("biz_alborada")])).toBe(false);
    expect(businessForAccessCode(" codigo-alborada ", businesses)?.id).toBe("biz_alborada");
    expect(businessForAccessCode("codigo-equivocado", businesses)).toBeUndefined();
    expect(businessForAccessCode("", businesses)).toBeUndefined();
  });

  it("cifra la IP y lee la IP del cliente y las cookies de la solicitud", () => {
    const request = new Request("https://demo.test/", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1", cookie: "a=1; alborada_session=x.y" },
    });
    expect(clientIp(request)).toBe("203.0.113.7");
    expect(hashIp("203.0.113.7", SECRET)).toBe(hashIp("203.0.113.7", SECRET));
    expect(hashIp("203.0.113.7", SECRET)).not.toContain("203");
    expect(readCookie(request, "alborada_session")).toBe("x.y");
    expect(readCookie(request, "otra")).toBeUndefined();
  });

  it("la cookie es httpOnly, SameSite=Lax y Secure solo en https", () => {
    expect(sessionCookieHeader("v", true)).toMatch(/HttpOnly; SameSite=Lax; Max-Age=\d+; Secure$/);
    expect(sessionCookieHeader("v", false)).not.toMatch(/Secure/);
  });
});
