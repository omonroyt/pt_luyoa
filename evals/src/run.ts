/**
 * ES: Corre el set de evaluación contra el agente y escribe el reporte (08 §3 y §4).
 *     Uso: pnpm eval -- [--case E-02] [--group scenario] [--repeat 3] [--concurrency 2]
 *          [--model id] [--judge id | --no-judge] [--label nombre]
 *     Cada conversación gasta en OpenRouter; el plan pide humo antes de la corrida completa.
 * EN: Runs the evaluation set against the agent and writes the report (08 §3 and §4).
 *     Usage: pnpm eval -- [--case E-02] [--group scenario] [--repeat 3] [--concurrency 2]
 *            [--model id] [--judge id | --no-judge] [--label name]
 *     Every conversation spends on OpenRouter; the plan requires a smoke run before the full one.
 */
import { loadCases } from "./cases/load-cases";
import { localDate, runEvaluation, writeReport } from "./evaluation";
import { parseRunOptions, selectCases } from "./run-options";

const options = parseRunOptions(
  process.argv.slice(2).filter((arg) => arg !== "--"),
  process.env,
);
const report = await runEvaluation({ ...options, cases: selectCases(loadCases(), options) });
const base = `${localDate()}-${options.label}`;
writeReport(base, report, report.raw);
console.log(
  `Puntaje medio ${report.summary.meanScore?.toFixed(2) ?? "—"} · costo ${report.summary.agentCostUsd.toFixed(4)} USD → evals/reports/${base}.md`,
);
