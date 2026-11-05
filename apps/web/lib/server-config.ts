/**
 * ES: Configuración del servidor de la aplicación, validada una sola vez. Solo se usa en
 *     código de servidor; ningún valor llega al navegador (RNF-01).
 * EN: Application server configuration, validated once. Only used in server code; no
 *     value ever reaches the browser (RNF-01).
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const MIN_SECRET_LENGTH = 32;

const optionalText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional(),
);

const ServerEnv = z.object({
  LUYOA_API_KEY: z.string().min(1, "Falta LUYOA_API_KEY"),
  LUYOA_API_BASE_URL: z.string().url().default("https://prueba-developer.luyoa.dev"),
  APPROVAL_SECRET: z
    .string()
    .min(MIN_SECRET_LENGTH, `APPROVAL_SECRET requiere ${MIN_SECRET_LENGTH} caracteres o más`),
  MCP_SERVICE_TOKEN: z
    .string()
    .min(MIN_SECRET_LENGTH, `MCP_SERVICE_TOKEN requiere ${MIN_SECRET_LENGTH} caracteres o más`),
  DATABASE_URL: z.string().default("file:./data/local.db"),
  DATABASE_AUTH_TOKEN: optionalText,
  BUSINESS_ID: z.string().default("biz_alborada"),
  // ES: Secreto con el que Vercel Cron llama /api/cron/weekly; sin él, el cron no corre.
  // EN: Secret Vercel Cron uses to call /api/cron/weekly; without it, the cron does not run.
  CRON_SECRET: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .string()
      .min(MIN_SECRET_LENGTH, `CRON_SECRET requiere ${MIN_SECRET_LENGTH} caracteres o más`)
      .optional(),
  ),
});

export type ServerConfig = {
  apiKey: string;
  apiBaseUrl: string;
  approvalSecret: string;
  mcpServiceToken: string;
  databaseUrl: string;
  databaseAuthToken: string | undefined;
  businessId: string;
  cronSecret: string | undefined;
};

/**
 * ES: Raíz del monorepo (carpeta con pnpm-workspace.yaml). Si no se encuentra, como en
 *     un despliegue empaquetado, se usa el directorio actual.
 * EN: Monorepo root (folder with pnpm-workspace.yaml). If not found, as in a bundled
 *     deployment, the current directory is used.
 */
export function findRepoRoot(start = process.cwd()): string {
  let current = start;
  while (!existsSync(path.join(current, "pnpm-workspace.yaml"))) {
    const parent = path.dirname(current);
    if (parent === current) return start;
    current = parent;
  }
  return current;
}

/**
 * ES: Las rutas file:./ se resuelven contra la raíz del repositorio. Es un archivo de datos,
 *     no código: la directiva evita que Turbopack incluya todo el proyecto en el despliegue.
 * EN: file:./ paths are resolved against the repository root. It is a data file, not code:
 *     the directive keeps Turbopack from including the whole project in the deployment.
 */
function resolveDatabaseUrl(url: string): string {
  if (!url.startsWith("file:./")) return url;
  return `file:${path.join(/* turbopackIgnore: true */ findRepoRoot(), url.slice("file:./".length))}`;
}

let cached: ServerConfig | undefined;

export function serverConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  if (cached && env === process.env) return cached;
  const parsed = ServerEnv.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Configuración inválida: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
    );
  }
  const config: ServerConfig = {
    apiKey: parsed.data.LUYOA_API_KEY,
    apiBaseUrl: parsed.data.LUYOA_API_BASE_URL,
    approvalSecret: parsed.data.APPROVAL_SECRET,
    mcpServiceToken: parsed.data.MCP_SERVICE_TOKEN,
    databaseUrl: resolveDatabaseUrl(parsed.data.DATABASE_URL),
    databaseAuthToken: parsed.data.DATABASE_AUTH_TOKEN,
    businessId: parsed.data.BUSINESS_ID,
    cronSecret: parsed.data.CRON_SECRET,
  };
  if (env === process.env) cached = config;
  return config;
}
