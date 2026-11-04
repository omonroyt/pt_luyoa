/**
 * ES: Configuración de ESLint. Aplica los límites de Clean Code y las reglas de
 *     nombres de docs/standards/coding-standards.md a todo el repositorio.
 * EN: ESLint configuration. Enforces the Clean Code limits and naming rules of
 *     docs/standards/coding-standards.md across the whole repository.
 */
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import prettierConfig from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const CLEAN_CODE_LIMITS = {
  "max-lines": ["error", { max: 250, skipBlankLines: true, skipComments: true }],
  "max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: true }],
  complexity: ["error", 10],
  "max-depth": ["error", 3],
  "max-params": ["error", 4],
  "max-nested-callbacks": ["error", 3],
};

const SAFETY_RULES = {
  eqeqeq: ["error", "always"],
  "no-var": "error",
  "prefer-const": "error",
  "no-param-reassign": "error",
  "no-nested-ternary": "error",
  "no-console": ["error", { allow: ["warn", "error"] }],
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/consistent-type-imports": "error",
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
  ],
  "@typescript-eslint/ban-ts-comment": [
    "error",
    { "ts-expect-error": "allow-with-description", "ts-ignore": true, "ts-nocheck": true },
  ],
};

// ES: Formatos de nombre. Las propiedades y métodos de objetos y tipos quedan libres
//     porque la API y los contratos del MCP usan snake_case (group_by, last_12_weeks).
// EN: Naming formats. Object and type properties and methods are free because the API
//     and the MCP contracts use snake_case (group_by, last_12_weeks).
const NAMING_RULES = {
  "@typescript-eslint/naming-convention": [
    "error",
    { selector: "default", format: ["camelCase"], leadingUnderscore: "allow" },
    { selector: "variable", format: ["camelCase", "UPPER_CASE", "PascalCase"] },
    { selector: "function", format: ["camelCase", "PascalCase"] },
    { selector: "parameter", format: ["camelCase"], leadingUnderscore: "allow" },
    { selector: "typeLike", format: ["PascalCase"] },
    { selector: "enumMember", format: ["PascalCase", "UPPER_CASE"] },
    {
      selector: [
        "objectLiteralProperty",
        "objectLiteralMethod",
        "typeProperty",
        "typeMethod",
        "import",
      ],
      format: null,
    },
  ],
};

export default defineConfig(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/coverage/**",
      "**/next-env.d.ts",
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: { ...CLEAN_CODE_LIMITS, ...SAFETY_RULES, ...NAMING_RULES },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "@next/next": nextPlugin },
    languageOptions: { globals: { ...globals.browser } },
    settings: { next: { rootDir: "apps/web" } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  {
    // ES: Las pruebas agrupan casos en describe(); el límite por función no aplica.
    // EN: Tests group cases inside describe(); the per-function limit does not apply.
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: { "max-lines-per-function": "off", "max-nested-callbacks": "off" },
  },
  {
    // ES: Herramientas de línea de comandos: su salida es la consola.
    // EN: Command-line tools: their output is the console.
    files: ["evals/**", "scripts/**", "**/scripts/**", ".claude/hooks/**"],
    rules: { "no-console": "off" },
  },
  prettierConfig,
);
