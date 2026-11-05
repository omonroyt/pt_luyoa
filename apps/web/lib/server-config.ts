/**
 * ES: Configuración del servidor de la aplicación, validada una sola vez. Solo se usa en
 *     código de servidor; ningún valor llega al navegador (RNF-01).
 * EN: Application server configuration, validated once. Only used in server code; no
 *     value ever reaches the browser (RNF-01).
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  MIN_SECRET_LENGTH,
  parseBusinessRegistry,
  type BusinessConfig,
} from "./tenancy/business-registry";

const optionalText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional(),
);

const ServerEnv = z.object({
  LUYOA_API_BASE_URL: z.string().url().default("https://prueba-developer.luyoa.dev"),
  APPROVAL_SECRET: z
    .string()
    .min(MIN_SECRET_LENGTH, `APPROVAL_SECRET requiere ${MIN_SECRET_LENGTH} caracteres o más`),
  DATABASE_URL: z.string().default("file:./data/local.db"),
  DATABASE_AUTH_TOKEN: optionalText,
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
  apiBaseUrl: string;
  approvalSecret: string;
  databaseUrl: string;
  databaseAuthToken: string | undefined;
  cronSecret: string | undefined;
  // ES: Negocios registrados (X-05); el primero es el negocio por defecto.
  // EN: Registered businesses (X-05); the first one is the default business.
  businesses: BusinessConfig[];
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
    apiBaseUrl: parsed.data.LUYOA_API_BASE_URL,
    approvalSecret: parsed.data.APPROVAL_SECRET,
    databaseUrl: resolveDatabaseUrl(parsed.data.DATABASE_URL),
    databaseAuthToken: parsed.data.DATABASE_AUTH_TOKEN,
    cronSecret: parsed.data.CRON_SECRET,
    businesses: parseBusinessRegistry(env),
  };
  if (env === process.env) cached = config;
  return config;
}
