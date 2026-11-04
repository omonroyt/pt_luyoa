/**
 * ES: Regla de comentarios bilingües: cada bloque de comentario debe incluir
 *     una línea "ES:" y una "EN:" (docs/standards/coding-standards.md §4).
 * EN: Bilingual comment rule: each comment block must include an "ES:" line
 *     and an "EN:" line (docs/standards/coding-standards.md §4).
 */
import { scanComments, type ScannedComment } from "./comment-scanner.ts";

export type BilingualViolation = {
  line: number;
  excerpt: string;
};

// ES: Directivas de herramientas que no son prosa y quedan exentas.
// EN: Tool directives that are not prose and are exempt.
const TOOL_DIRECTIVE =
  /^\s*(eslint|prettier-ignore|istanbul|c8|global\s|#region|#endregion|\/\s*<reference|@jsx|@vitest-environment)/;
const ONLY_JSDOC_TAGS = /^\s*\*?\s*(@type|@typedef|@satisfies|@template|@import)\b/;
const SPANISH_MARK = /(^|\s|\*)ES:/m;
const ENGLISH_MARK = /(^|\s|\*)EN:/m;

/**
 * ES: Une comentarios de línea consecutivos que ocupan su propia línea en un solo bloque.
 * EN: Merges consecutive own-line line comments into a single block.
 */
function groupComments(comments: ScannedComment[]): ScannedComment[] {
  const groups: ScannedComment[] = [];
  for (const comment of comments) {
    const previous = groups.at(-1);
    const continuesBlock =
      previous?.kind === "line" &&
      comment.kind === "line" &&
      previous.ownLine &&
      comment.ownLine &&
      comment.startLine === previous.endLine + 1;
    if (previous && continuesBlock) {
      previous.text += `\n${comment.text}`;
      previous.endLine = comment.endLine;
    } else {
      groups.push({ ...comment });
    }
  }
  return groups;
}

function isExempt(text: string): boolean {
  const meaningfulLines = text
    .split("\n")
    .map((line) => line.replace(/^\s*\*+/, "").trim())
    .filter(Boolean);
  if (meaningfulLines.length === 0) return true;
  if (TOOL_DIRECTIVE.test(meaningfulLines[0] ?? "")) return true;
  return meaningfulLines.every((line) => ONLY_JSDOC_TAGS.test(line));
}

/**
 * ES: Devuelve los bloques de comentario que no son bilingües.
 * EN: Returns the comment blocks that are not bilingual.
 */
export function findBilingualViolations(source: string): BilingualViolation[] {
  return groupComments(scanComments(source))
    .filter((block) => !isExempt(block.text))
    .filter((block) => !(SPANISH_MARK.test(block.text) && ENGLISH_MARK.test(block.text)))
    .map((block) => ({
      line: block.startLine,
      excerpt: block.text.trim().split("\n")[0]?.slice(0, 80) ?? "",
    }));
}
