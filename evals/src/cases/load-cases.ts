/**
 * ES: Carga y valida los casos de evals/cases/. Un caso inválido o un id repetido detiene
 *     la corrida antes de gastar en el modelo.
 * EN: Loads and validates the cases in evals/cases/. An invalid case or a repeated id
 *     stops the run before spending on the model.
 */
import { readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { EvalCase } from "./case-schema";

export const CASES_DIR = new URL("../../cases/", import.meta.url);
export const GOLDEN_DIR = new URL("../../golden/", import.meta.url);

export function parseCase(source: string, file: string): EvalCase {
  const parsed = EvalCase.safeParse(parse(source));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`${file}: ${issues.join("; ")}`);
  }
  return parsed.data;
}

export function loadCases(dir: URL = CASES_DIR): EvalCase[] {
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".yaml"))
    .sort();
  const cases = files.map((file) => parseCase(readFileSync(new URL(file, dir), "utf8"), file));
  const seen = new Set<string>();
  for (const evalCase of cases) {
    if (seen.has(evalCase.id)) throw new Error(`Id de caso repetido: ${evalCase.id}`);
    seen.add(evalCase.id);
  }
  return cases;
}

export type Golden = { id: string; data_as_of: string; figures: unknown };

export function loadGolden(id: string, dir: URL = GOLDEN_DIR): Golden {
  return JSON.parse(readFileSync(new URL(`${id}.json`, dir), "utf8")) as Golden;
}
