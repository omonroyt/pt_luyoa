/**
 * ES: Registro de negocios (X-05, ADR-16). Cada negocio declara el *nombre* de la variable de
 *     entorno con su llave de la API y con su token del MCP; los secretos viven cada uno en
 *     su propia variable. Sin BUSINESSES se arma un solo negocio con las variables de siempre
 *     (BUSINESS_ID, LUYOA_API_KEY y MCP_SERVICE_TOKEN). Los errores nombran variables, nunca
 *     valores.
 * EN: Business registry (X-05, ADR-16). Each business declares the *name* of the environment
 *     variable holding its API key and its MCP token; each secret lives in its own variable.
 *     Without BUSINESSES a single business is built from the usual variables (BUSINESS_ID,
 *     LUYOA_API_KEY and MCP_SERVICE_TOKEN). Errors name variables, never values.
 */
import { z } from "zod";

export const MIN_SECRET_LENGTH = 32;

export type BusinessConfig = {
  id: string;
  name: string;
  apiKey: string;
  mcpServiceToken: string;
};

const EnvName = z.string().regex(/^[A-Z][A-Z0-9_]*$/, "nombre de variable en MAYÚSCULAS");

const BusinessReference = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/, "id en minúsculas, dígitos y guion bajo"),
  name: z.string().min(1),
  apiKeyEnv: EnvName,
  mcpTokenEnv: EnvName,
});
type BusinessReference = z.infer<typeof BusinessReference>;

const Registry = z.array(BusinessReference).min(1, "BUSINESSES necesita al menos un negocio");

type Env = Record<string, string | undefined>;

function defaultReference(env: Env): BusinessReference {
  return {
    id: env.BUSINESS_ID?.trim() || "biz_alborada",
    name: "Café Alborada",
    apiKeyEnv: "LUYOA_API_KEY",
    mcpTokenEnv: "MCP_SERVICE_TOKEN",
  };
}

function parseReferences(raw: string): BusinessReference[] {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("BUSINESSES no es un JSON válido.");
  }
  const parsed = Registry.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`BUSINESSES inválido: ${issues.join("; ")}`);
  }
  return parsed.data;
}

function resolveSecrets(reference: BusinessReference, env: Env): BusinessConfig {
  const apiKey = env[reference.apiKeyEnv]?.trim();
  const token = env[reference.mcpTokenEnv]?.trim();
  if (!apiKey) throw new Error(`Falta ${reference.apiKeyEnv} (llave de ${reference.id}).`);
  if (!token || token.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `${reference.mcpTokenEnv} (token MCP de ${reference.id}) requiere ${MIN_SECRET_LENGTH} caracteres o más.`,
    );
  }
  return { id: reference.id, name: reference.name, apiKey, mcpServiceToken: token };
}

/**
 * ES: Dos negocios nunca comparten id, llave de la API ni token del MCP: compartirlos
 *     mezclaría sus datos o haría ambiguo a quién pertenece una solicitud.
 * EN: Two businesses never share an id, API key or MCP token: sharing them would mix their
 *     data or make it ambiguous which business a request belongs to.
 */
function assertDistinct(references: BusinessReference[], businesses: BusinessConfig[]): void {
  const checks: Array<[string, (business: BusinessConfig) => string]> = [
    ["el mismo id", (business) => business.id],
    ["la misma llave de la API", (business) => business.apiKey],
    ["el mismo token del MCP", (business) => business.mcpServiceToken],
  ];
  for (const [label, valueOf] of checks) {
    const seen = new Map<string, string>();
    businesses.forEach((business, index) => {
      const previous = seen.get(valueOf(business));
      if (previous !== undefined) {
        throw new Error(`Los negocios ${previous} y ${references[index]?.id} usan ${label}.`);
      }
      seen.set(valueOf(business), business.id);
    });
  }
}

export function parseBusinessRegistry(env: Env): BusinessConfig[] {
  const raw = env.BUSINESSES?.trim();
  const references = raw ? parseReferences(raw) : [defaultReference(env)];
  const businesses = references.map((reference) => resolveSecrets(reference, env));
  assertDistinct(references, businesses);
  return businesses;
}
