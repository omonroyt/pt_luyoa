/**
 * ES: Configuración de drizzle-kit: genera las migraciones SQL a partir del esquema.
 *     Uso: pnpm --filter @alborada/web db:generate
 * EN: drizzle-kit configuration: generates the SQL migrations from the schema.
 *     Usage: pnpm --filter @alborada/web db:generate
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
});
