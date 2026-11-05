import { describe, expect, it } from "vitest";
import { issueSession } from "../auth/demo-session";
import { parseBusinessRegistry } from "./business-registry";
import { businessForRequest, businessForServiceToken } from "./current-business";

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

describe("código de acceso y negocio de la sesión (IMP-63)", () => {
  const SECRET = "s".repeat(40);
  const withCodes = JSON.stringify([
    {
      id: "biz_alborada",
      name: "A",
      apiKeyEnv: "KEY_A",
      mcpTokenEnv: "TOKEN_A",
      accessCodeEnv: "CODE_A",
    },
    {
      id: "biz_norte",
      name: "N",
      apiKeyEnv: "KEY_B",
      mcpTokenEnv: "TOKEN_B",
      accessCodeEnv: "CODE_B",
    },
  ]);
  const codeEnv = (overrides: Record<string, string> = {}) =>
    twoBusinessEnv({
      BUSINESSES: withCodes,
      CODE_A: "codigo-alborada",
      CODE_B: "codigo-norte",
      ...overrides,
    });
  const page = (cookie?: string) =>
    new Request("https://demo.test/", { headers: cookie ? { cookie } : {} });

  it("el negocio por defecto toma DEMO_ACCESS_CODE; sin él no hay código", () => {
    const base = { LUYOA_API_KEY: "llave", MCP_SERVICE_TOKEN: TOKEN_A };
    expect(parseBusinessRegistry({ ...base, DEMO_ACCESS_CODE: "codigo-demo" })[0]?.accessCode).toBe(
      "codigo-demo",
    );
    expect(parseBusinessRegistry(base)[0]?.accessCode).toBeUndefined();
  });

  it("rechaza códigos cortos o repetidos sin mostrarlos", () => {
    expect(() => parseBusinessRegistry(codeEnv({ CODE_B: "corto" }))).toThrow(
      /CODE_B .*8 caracteres/,
    );
    expect(() => parseBusinessRegistry(codeEnv({ CODE_B: "codigo-alborada" }))).toThrow(
      /^Los negocios biz_alborada y biz_norte usan el mismo código de acceso\.$/,
    );
  });

  it("sin códigos la interfaz usa el negocio por defecto sin sesión", () => {
    const config = { businesses: parseBusinessRegistry(twoBusinessEnv()), approvalSecret: SECRET };
    expect(businessForRequest(page(), config)).toMatchObject({
      business: { id: "biz_alborada" },
      session: null,
    });
  });

  it("con códigos, el negocio sale de la sesión firmada y sin ella no hay negocio", () => {
    const config = { businesses: parseBusinessRegistry(codeEnv()), approvalSecret: SECRET };
    const { value } = issueSession("biz_norte", SECRET);
    expect(businessForRequest(page(`alborada_session=${value}`), config)?.business.id).toBe(
      "biz_norte",
    );
    expect(businessForRequest(page(), config)).toBeUndefined();
    const foreign = issueSession("biz_norte", "o".repeat(40)).value;
    expect(businessForRequest(page(`alborada_session=${foreign}`), config)).toBeUndefined();
  });
});
