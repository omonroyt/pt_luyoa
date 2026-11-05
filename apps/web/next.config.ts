import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// ES: El .env vive en la raíz del monorepo para que la app, el CLI del MCP y las
//     evaluaciones compartan configuración. No sobrescribe variables ya definidas
//     (por ejemplo, las del despliegue en Vercel).
// EN: The .env lives at the monorepo root so the app, the MCP CLI and the evals
//     share configuration. It does not override variables already defined
//     (for example, the ones from the Vercel deployment).
const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootEnvFile = path.resolve(appDirectory, "../../.env");
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const nextConfig: NextConfig = {
  transpilePackages: ["@alborada/shared", "@alborada/mcp-server"],
  // ES: Las funciones de la API aplican las migraciones al abrir la base (Turso en Vercel).
  //     Los archivos SQL no se importan desde el código, así que el rastreo de archivos no
  //     los ve: se incluyen a mano, junto con pnpm-workspace.yaml, que marca la raíz del
  //     monorepo para encontrarlos.
  // EN: API functions apply the migrations when opening the database (Turso on Vercel). The
  //     SQL files are not imported from code, so file tracing does not see them: they are
  //     included by hand, along with pnpm-workspace.yaml, which marks the monorepo root to
  //     find them.
  outputFileTracingRoot: path.join(appDirectory, "../.."),
  outputFileTracingIncludes: {
    "/api/**": ["./lib/db/migrations/**/*", "../../pnpm-workspace.yaml"],
  },
};

export default nextConfig;
