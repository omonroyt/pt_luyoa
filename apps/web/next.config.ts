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
const rootEnvFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env");
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const nextConfig: NextConfig = {
  transpilePackages: ["@alborada/shared", "@alborada/mcp-server"],
};

export default nextConfig;
