/**
 * ES: Criterios de aceptación leídos de docs/specs/02_CRITERIOS_ACEPTACION.md, la única
 *     fuente de su texto. El juez recibe el texto de los criterios de cada caso.
 * EN: Acceptance criteria read from docs/specs/02_CRITERIOS_ACEPTACION.md, the single
 *     source of their text. The judge receives the text of each case's criteria.
 */
import { readFileSync } from "node:fs";

export const CRITERIA_DOC = new URL(
  "../../../docs/specs/02_CRITERIOS_ACEPTACION.md",
  import.meta.url,
);

const ROW = /^\| (CA-[A-Z0-9-]+) \| (.+?) \|/;

export function parseCriteria(markdown: string): Map<string, string> {
  const criteria = new Map<string, string>();
  for (const line of markdown.split("\n")) {
    const match = ROW.exec(line);
    if (match?.[1] && match[2]) criteria.set(match[1], match[2].replaceAll("**", "").trim());
  }
  return criteria;
}

export function loadCriteria(doc: URL = CRITERIA_DOC): Map<string, string> {
  return parseCriteria(readFileSync(doc, "utf8"));
}
