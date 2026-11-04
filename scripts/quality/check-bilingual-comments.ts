/**
 * ES: CLI del verificador de comentarios bilingües. Sin argumentos revisa todo el
 *     código del repositorio; con argumentos revisa solo esos archivos (pre-commit).
 * EN: Bilingual comment checker CLI. Without arguments it checks all the code in
 *     the repository; with arguments it checks only those files (pre-commit).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { findBilingualViolations } from "./bilingual-comments.ts";

const CODE_FILE = /\.(ts|tsx|mts|js|mjs|cjs)$/;
const SCAN_ROOTS = [
  "apps",
  "packages",
  "evals",
  "scripts",
  ".claude/hooks",
  "eslint.config.mjs",
  "commitlint.config.mjs",
  "vitest.config.ts",
];
const IGNORED_DIRECTORIES = new Set(["node_modules", ".next", "dist", "coverage", ".turbo"]);
const IGNORED_FILES = new Set(["next-env.d.ts"]);

function collectCodeFiles(entry: string): string[] {
  const stats = statSync(entry, { throwIfNoEntry: false });
  if (!stats) return [];
  if (stats.isFile())
    return CODE_FILE.test(entry) && !IGNORED_FILES.has(path.basename(entry)) ? [entry] : [];
  return readdirSync(entry)
    .filter((child) => !IGNORED_DIRECTORIES.has(child))
    .flatMap((child) => collectCodeFiles(path.join(entry, child)));
}

const requestedFiles = process.argv.slice(2).filter((file) => CODE_FILE.test(file));
const files = requestedFiles.length > 0 ? requestedFiles : SCAN_ROOTS.flatMap(collectCodeFiles);

let violationCount = 0;
for (const file of files) {
  for (const violation of findBilingualViolations(readFileSync(file, "utf8"))) {
    violationCount += 1;
    console.error(`${file}:${violation.line}  ${violation.excerpt}`);
  }
}

if (violationCount > 0) {
  console.error(
    `\nES: ${violationCount} comentario(s) sin ES:/EN:. Ver docs/standards/coding-standards.md §4.`,
  );
  console.error(
    `EN: ${violationCount} comment(s) without ES:/EN:. See docs/standards/coding-standards.md §4.`,
  );
  process.exit(1);
}

console.warn(`ES: ${files.length} archivos revisados; todos los comentarios son bilingües.`);
console.warn(`EN: ${files.length} files checked; every comment is bilingual.`);
