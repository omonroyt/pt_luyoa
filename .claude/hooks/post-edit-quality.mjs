/**
 * ES: Hook PostToolUse tras editar un archivo de código: avisa a Claude si el
 *     archivo excede el tamaño máximo o tiene comentarios que no son bilingües,
 *     para que lo corrija en el siguiente paso.
 * EN: PostToolUse hook after editing a code file: tells Claude when the file
 *     exceeds the maximum size or has comments that are not bilingual, so it
 *     fixes them in the next step.
 */
import { readFileSync } from "node:fs";
import { findBilingualViolations } from "../../scripts/quality/bilingual-comments.ts";
import { block, readHookInput } from "./lib/hook-io.mjs";

const CODE_FILE = /\.(ts|tsx|mts|js|mjs|cjs)$/;
const MAX_EFFECTIVE_LINES = 250;

/**
 * ES: Cuenta líneas con código, sin líneas en blanco ni de solo comentario.
 * EN: Counts lines with code, excluding blank and comment-only lines.
 * @param {string} source
 */
function countEffectiveLines(source) {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^(\/\/|\/\*|\*)/.test(line)).length;
}

const event = await readHookInput();
const filePath = String(event.tool_input?.file_path ?? "");

if (CODE_FILE.test(filePath) && !filePath.includes("node_modules")) {
  const source = readFileSync(filePath, "utf8");
  const effectiveLines = countEffectiveLines(source);
  if (effectiveLines > MAX_EFFECTIVE_LINES) {
    block(
      "file-too-large",
      `${filePath} tiene ${effectiveLines} líneas efectivas (máximo ${MAX_EFFECTIVE_LINES}). Divídelo por responsabilidad.`,
      `${filePath} has ${effectiveLines} effective lines (max ${MAX_EFFECTIVE_LINES}). Split it by responsibility.`,
    );
  }
  const violations = findBilingualViolations(source);
  if (violations.length > 0) {
    const lines = violations.map((violation) => violation.line).join(", ");
    block(
      "bilingual-comments",
      `${filePath}: comentarios sin ES:/EN: en las líneas ${lines}.`,
      `${filePath}: comments without ES:/EN: at lines ${lines}.`,
    );
  }
}
