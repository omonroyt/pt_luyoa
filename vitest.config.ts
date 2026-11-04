/**
 * ES: Configuración de Vitest: pruebas junto al código en todas las capas, sin red.
 * EN: Vitest configuration: tests next to the code in every layer, without network.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/**/*.test.ts",
      "apps/**/*.test.{ts,tsx}",
      "evals/**/*.test.ts",
      "scripts/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/.next/**"],
  },
});
