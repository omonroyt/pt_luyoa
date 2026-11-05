/**
 * ES: Opciones de una corrida de evaluación: casos, repeticiones, concurrencia, modelo y
 *     juez. Los valores por omisión salen del entorno (OPENROUTER_MODEL y
 *     OPENROUTER_JUDGE_MODEL); el juez por omisión es el que se decidió en 08 §4.2.
 * EN: Options of an evaluation run: cases, repeats, concurrency, model and judge. Defaults
 *     come from the environment (OPENROUTER_MODEL and OPENROUTER_JUDGE_MODEL); the default
 *     judge is the one decided in 08 §4.2.
 */
import { parseArgs } from "node:util";
import type { EvalCase } from "./cases/case-schema";

export const DEFAULT_JUDGE = "minimax/minimax-m3.1-flash";

export type RunOptions = {
  caseIds: string[];
  groups: string[];
  repeats: number;
  concurrency: number;
  model: string;
  judge: string | null;
  label: string;
};

const positive = (value: string | undefined, fallback: number) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`Valor inválido: ${value}`);
  return parsed;
};

export function parseRunOptions(argv: string[], env: NodeJS.ProcessEnv): RunOptions {
  const { values } = parseArgs({
    args: argv,
    options: {
      case: { type: "string", multiple: true, default: [] },
      group: { type: "string", multiple: true, default: [] },
      repeat: { type: "string" },
      concurrency: { type: "string" },
      model: { type: "string" },
      judge: { type: "string" },
      "no-judge": { type: "boolean", default: false },
      label: { type: "string" },
    },
    allowPositionals: false,
  });
  const model = values.model ?? env.OPENROUTER_MODEL;
  if (!model) throw new Error("Falta el modelo: --model o OPENROUTER_MODEL.");
  const judge = values["no-judge"]
    ? null
    : (values.judge ?? (env.OPENROUTER_JUDGE_MODEL || DEFAULT_JUDGE));
  return {
    caseIds: values.case,
    groups: values.group,
    repeats: positive(values.repeat, 1),
    concurrency: positive(values.concurrency, 2),
    model,
    judge,
    label: values.label ?? model.split("/").at(-1) ?? model,
  };
}

export function selectCases(cases: EvalCase[], options: RunOptions): EvalCase[] {
  const byId =
    options.caseIds.length === 0 || ((item: EvalCase) => options.caseIds.includes(item.id));
  const selected = cases.filter(
    (item) =>
      (byId === true || byId(item)) &&
      (options.groups.length === 0 || options.groups.includes(item.group)),
  );
  const unknown = options.caseIds.filter((id) => !cases.some((item) => item.id === id));
  if (unknown.length > 0) throw new Error(`Casos desconocidos: ${unknown.join(", ")}`);
  return selected;
}
