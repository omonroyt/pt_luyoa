/**
 * ES: Conexión a la base de datos (SQLite local o Turso según DATABASE_URL). Las
 *     migraciones se aplican automáticamente al abrirla, sin pasos manuales.
 * EN: Database connection (local SQLite or Turso depending on DATABASE_URL). Migrations
 *     are applied automatically when it opens, with no manual steps.
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { findRepoRoot, serverConfig } from "../server-config";
import * as schema from "./schema";

export type Database = LibSQLDatabase<typeof schema>;

export type DatabaseOptions = { url: string; authToken?: string; migrationsFolder?: string };

/**
 * ES: Carpeta de migraciones. En el repositorio está bajo la raíz del monorepo; en una
 *     función empaquetada se busca también junto al directorio actual, por si el marcador
 *     de la raíz no se encuentra.
 * EN: Migrations folder. In the repository it is under the monorepo root; in a bundled
 *     function it is also looked up next to the current directory, in case the root marker
 *     is not found.
 */
function defaultMigrationsFolder(): string {
  const candidates = [
    path.join(/* turbopackIgnore: true */ findRepoRoot(), "apps/web/lib/db/migrations"),
    path.join(/* turbopackIgnore: true */ process.cwd(), "lib/db/migrations"),
  ];
  return candidates.find((folder) => existsSync(folder)) ?? (candidates[0] as string);
}

function ensureLocalDirectory(url: string): void {
  if (!url.startsWith("file:")) return;
  const filePath = url.startsWith("file:///") ? fileURLToPath(url) : url.slice("file:".length);
  mkdirSync(path.dirname(filePath), { recursive: true });
}

export async function openDatabase(options: DatabaseOptions): Promise<Database> {
  ensureLocalDirectory(options.url);
  const client = createClient({ url: options.url, authToken: options.authToken });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: options.migrationsFolder ?? defaultMigrationsFolder() });
  return db;
}

let shared: Promise<Database> | undefined;

/**
 * ES: Conexión compartida por el proceso; si falla al abrir, el siguiente intento la reabre.
 * EN: Process-wide shared connection; if opening fails, the next attempt reopens it.
 */
export function getDatabase(): Promise<Database> {
  const config = serverConfig();
  shared ??= openDatabase({ url: config.databaseUrl, authToken: config.databaseAuthToken }).catch(
    (error: unknown) => {
      shared = undefined;
      throw error;
    },
  );
  return shared;
}
