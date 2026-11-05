import { describe, expect, it } from "vitest";
import { parseBusinessRegistry } from "./business-registry";
import { businessForServiceToken } from "./current-business";

const TOKEN_A = "a".repeat(40);
const TOKEN_B = "b".repeat(40);

const TWO_BUSINESSES = JSON.stringify([
  { id: "biz_alborada", name: "Café Alborada", apiKeyEnv: "KEY_A", mcpTokenEnv: "TOKEN_A" },
  { id: "biz_norte", name: "Café Norte", apiKeyEnv: "KEY_B", mcpTokenEnv: "TOKEN_B" },
]);

const twoBusinessEnv = (overrides: Record<string, string> = {}) => ({
  BUSINESSES: TWO_BUSINESSES,
  KEY_A: "llave-secreta-a",
  KEY_B: "llave-secreta-b",
  TOKEN_A,
  TOKEN_B,
  ...overrides,
});

const bearer = (token?: string) =>
  new Request("http://localhost/api/mcp", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

describe("registro de negocios (X-05)", () => {
  it("sin BUSINESSES arma un solo negocio con las variables de siempre", () => {
    const [business, ...rest] = parseBusinessRegistry({
      LUYOA_API_KEY: "llave",
      MCP_SERVICE_TOKEN: TOKEN_A,
    });
    expect(rest).toHaveLength(0);
    expect(business).toEqual({
      id: "biz_alborada",
      name: "Café Alborada",
      apiKey: "llave",
      mcpServiceToken: TOKEN_A,
    });
  });

  it("lee cada negocio con sus propias variables", () => {
    const businesses = parseBusinessRegistry(twoBusinessEnv());
    expect(businesses.map((business) => [business.id, business.apiKey])).toEqual([
      ["biz_alborada", "llave-secreta-a"],
      ["biz_norte", "llave-secreta-b"],
    ]);
  });

  it("nombra la variable que falta sin mostrar ningún secreto", () => {
    const env = twoBusinessEnv();
    delete (env as Record<string, string | undefined>).KEY_B;
    expect(() => parseBusinessRegistry(env)).toThrow(/Falta KEY_B \(llave de biz_norte\)/);
    expect(() => parseBusinessRegistry(twoBusinessEnv({ TOKEN_B: "corto" }))).toThrow(
      /TOKEN_B .*32 caracteres/,
    );
  });

  it("rechaza dos negocios con la misma llave, el mismo token o el mismo id", () => {
    const shared = [
      twoBusinessEnv({ KEY_B: "llave-secreta-a" }),
      twoBusinessEnv({ TOKEN_B: TOKEN_A }),
      twoBusinessEnv({ BUSINESSES: TWO_BUSINESSES.replace("biz_norte", "biz_alborada") }),
    ];
    const messages = shared.map((env) => {
      try {
        parseBusinessRegistry(env);
        return "";
      } catch (error) {
        return error instanceof Error ? error.message : "";
      }
    });
    expect(messages[0]).toMatch(/misma llave de la API/);
    expect(messages[1]).toMatch(/mismo token del MCP/);
    expect(messages[2]).toMatch(/mismo id/);
    for (const message of messages) {
      expect(message).not.toMatch(/llave-secreta|aaaa/);
    }
  });

  it("rechaza un registro mal formado", () => {
    expect(() => parseBusinessRegistry(twoBusinessEnv({ BUSINESSES: "[{" }))).toThrow(
      /no es un JSON válido/,
    );
    expect(() => parseBusinessRegistry(twoBusinessEnv({ BUSINESSES: "[]" }))).toThrow(
      /al menos un negocio/,
    );
  });
});

describe("negocio de una solicitud al MCP (X-05)", () => {
  const businesses = parseBusinessRegistry(twoBusinessEnv());

  it("el token de servicio identifica a un solo negocio", () => {
    expect(businessForServiceToken(bearer(TOKEN_A), businesses)?.id).toBe("biz_alborada");
    expect(businessForServiceToken(bearer(TOKEN_B), businesses)?.id).toBe("biz_norte");
  });

  it("sin token o con uno desconocido no hay negocio", () => {
    expect(businessForServiceToken(bearer(), businesses)).toBeUndefined();
    expect(businessForServiceToken(bearer("c".repeat(40)), businesses)).toBeUndefined();
  });
});
