/**
 * ES: Registro de negocios (X-05, ADR-16). Cada negocio declara el *nombre* de la variable de
 *     entorno con su llave de la API y con su token del MCP; los secretos viven cada uno en
 *     su propia variable, igual que su código de acceso a la demo (opcional, IMP-63). Sin
 *     BUSINESSES se arma un solo negocio con las variables de siempre (BUSINESS_ID,
 *     LUYOA_API_KEY, MCP_SERVICE_TOKEN y DEMO_ACCESS_CODE). Los errores nombran variables,
 *     nunca valores.
 * EN: Business registry (X-05, ADR-16). Each business declares the *name* of the environment
 *     variable holding its API key and its MCP token; each secret lives in its own variable,
 *     and so does its demo access code (optional, IMP-63). Without BUSINESSES a single
 *     business is built from the usual variables (BUSINESS_ID, LUYOA_API_KEY,
 *     MCP_SERVICE_TOKEN and DEMO_ACCESS_CODE). Errors name variables, never values.
 */
import { z } from "zod";

export const MIN_SECRET_LENGTH = 32;
export const MIN_ACCESS_CODE_LENGTH = 8;

export type BusinessConfig = {
  id: string;
  name: string;
  apiKey: string;
  mcpServiceToken: string;
  // ES: Código para entrar a la demo publicada como este negocio; sin él no hay acceso por
  //     la interfaz cuando la protección está activa.
  // EN: Code to enter the published demo as this business; without it there is no UI access
  //     when protection is on.
  accessCode?: string;
};

const EnvName = z.string().regex(/^[A-Z][A-Z0-9_]*$/, "nombre de variable en MAYÚSCULAS");

const BusinessReference = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/, "id en minúsculas, dígitos y guion bajo"),
  name: z.string().min(1),
  apiKeyEnv: EnvName,
  mcpTokenEnv: EnvName,
  accessCodeEnv: EnvName.optional(),
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
    accessCodeEnv: "DEMO_ACCESS_CODE",
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

function readAccessCode(reference: BusinessReference, env: Env): string | undefined {
  if (!reference.accessCodeEnv) return undefined;
  const accessCode = env[reference.accessCodeEnv]?.trim();
  if (accessCode && accessCode.length < MIN_ACCESS_CODE_LENGTH) {
    throw new Error(
      `${reference.accessCodeEnv} (código de acceso de ${reference.id}) requiere ${MIN_ACCESS_CODE_LENGTH} caracteres o más.`,
    );
  }
  return accessCode || undefined;
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
  const accessCode = readAccessCode(reference, env);
  const business = { id: reference.id, name: reference.name, apiKey, mcpServiceToken: token };
  return accessCode ? { ...business, accessCode } : business;
}

/**
 * ES: Dos negocios nunca comparten id, llave de la API, token del MCP ni código de acceso:
 *     compartirlos mezclaría sus datos o haría ambiguo a quién pertenece una solicitud.
 * EN: Two businesses never share an id, API key, MCP token or access code: sharing them
 *     would mix their data or make it ambiguous which business a request belongs to.
 */
function assertDistinct(references: BusinessReference[], businesses: BusinessConfig[]): void {
  const checks: Array<[string, (business: BusinessConfig) => string | undefined]> = [
    ["el mismo id", (business) => business.id],
    ["la misma llave de la API", (business) => business.apiKey],
    ["el mismo token del MCP", (business) => business.mcpServiceToken],
    ["el mismo código de acceso", (business) => business.accessCode],
  ];
  for (const [label, valueOf] of checks) {
    const seen = new Map<string, string>();
    businesses.forEach((business, index) => {
      const value = valueOf(business);
      if (value === undefined) return;
      const previous = seen.get(value);
      if (previous !== undefined) {
        throw new Error(`Los negocios ${previous} y ${references[index]?.id} usan ${label}.`);
      }
      seen.set(value, business.id);
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
