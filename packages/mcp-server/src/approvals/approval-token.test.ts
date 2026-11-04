import { describe, expect, it } from "vitest";
import { createMemoryApprovalStore } from "./approval-store";
import { APPROVAL_TTL_MS, issueApprovalToken, verifyApprovalToken } from "./approval-token";
import { canonicalJson, contentHash } from "./content-hash";

const SECRET = "secreto-de-prueba";
const NOW = new Date("2026-11-04T12:00:00Z");
const CONTENT = {
  name: "Te extrañamos",
  channel: "whatsapp",
  message: "Hola",
  offer: { type: "free_item" },
};
const BASE = { action: "create" as const, businessId: "biz_alborada", content: CONTENT };

async function issue(store = createMemoryApprovalStore()) {
  const { token } = await issueApprovalToken(BASE, { secret: SECRET, store, now: () => NOW });
  return { token, store };
}

const verify = (
  token: string,
  store: ReturnType<typeof createMemoryApprovalStore>,
  overrides = {},
) =>
  verifyApprovalToken({ ...BASE, token, ...overrides }, { secret: SECRET, store, now: () => NOW });

describe("content hash", () => {
  it("es igual sin importar el orden de las llaves y cambia con cualquier diferencia", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
    expect(contentHash({ a: 1, b: 2 })).toBe(contentHash({ b: 2, a: 1 }));
    expect(contentHash({ message: "Hola" })).not.toBe(contentHash({ message: "Hola." }));
  });
});

describe("approval tokens", () => {
  it("acepta un token válido para el contenido exacto aprobado", async () => {
    const { token, store } = await issue();
    await expect(verify(token, store)).resolves.toBeUndefined();
  });

  it("rechaza reutilizar un token", async () => {
    const { token, store } = await issue();
    await verify(token, store);
    await expect(verify(token, store)).rejects.toThrow(/ya se usó/);
  });

  it("rechaza el token si el contenido cambió después de aprobar", async () => {
    const { token, store } = await issue();
    await expect(
      verify(token, store, { content: { ...CONTENT, message: "Hola!" } }),
    ).rejects.toThrow(/contenido cambió/);
  });

  it("rechaza un token de crear usado para enviar", async () => {
    const { token, store } = await issue();
    await expect(verify(token, store, { action: "send" })).rejects.toThrow(/otra acción/);
  });

  it("rechaza un token vencido", async () => {
    const { token, store } = await issue();
    const later = new Date(NOW.getTime() + APPROVAL_TTL_MS + 1);
    await expect(
      verifyApprovalToken({ ...BASE, token }, { secret: SECRET, store, now: () => later }),
    ).rejects.toThrow(/expiró/);
  });

  it("rechaza un token alterado o firmado con otra llave", async () => {
    const { token, store } = await issue();
    const [payload] = token.split(".");
    await expect(verify(`${payload}.firmaFalsa`, store)).rejects.toThrow(/firma/);
    await expect(
      verifyApprovalToken({ ...BASE, token }, { secret: "otra-llave", store, now: () => NOW }),
    ).rejects.toThrow(/firma/);
  });

  it("rechaza un token de otro negocio o de otra campaña", async () => {
    const { token, store } = await issue();
    await expect(verify(token, store, { businessId: "biz_otro" })).rejects.toThrow(/otro negocio/);
    await expect(verify(token, store, { campaignId: "cmp_x" })).rejects.toThrow(/otra campaña/);
  });

  it("usa el código approval_invalid con una sugerencia para el agente", async () => {
    const { token, store } = await issue();
    const error = await verify(token, store, { action: "send" }).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: "approval_invalid" });
  });
});
