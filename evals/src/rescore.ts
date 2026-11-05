/**
 * ES: Vuelve a calificar corridas guardadas con el código actual de las verificaciones,
 *     sin volver a llamar al modelo ni al juez (su calificación se conserva). Sirve cuando
 *     se corrige el verificador después de una corrida.
 *     Uso: pnpm rescore -- <base> [<base> …] [--compare nombre]
 *     <base> es el nombre del reporte sin extensión, p. ej. 2026-11-05-compare-completa-glm-5.3-flash.
 *     Necesita evals/reports/<base>.json y evals/reports/raw/<base>.json.
 * EN: Re-scores stored runs with the current checks code, without calling the model or
 *     the judge again (its rating is kept). It is useful when the verifier is fixed after
 *     a run.
 *     Usage: pnpm rescore -- <base> [<base> …] [--compare name]
 *     <base> is the report name without extension, e.g. 2026-11-05-compare-completa-glm-5.3-flash.
 *     It needs evals/reports/<base>.json and evals/reports/raw/<base>.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadCases } from "./cases/load-cases";
import { rescoreCase, type CaseResult } from "./evaluate-case";
import { RAW_DIR, REPORTS_DIR, writeReport, type RawRun, type RunReport } from "./evaluation";
import { decide, modelRow, renderComparison } from "./report/compare";
import { summarize } from "./report/summary";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== "--"),
  options: { compare: { type: "string" } },
  allowPositionals: true,
});
if (positionals.length === 0) throw new Error("Indica al menos un reporte a recalificar.");

const cases = new Map(loadCases().map((item) => [item.id, item]));
const readJson = <T>(url: URL) => JSON.parse(readFileSync(url, "utf8")) as T;

function rescoreRun(base: string): RunReport {
  const report = readJson<RunReport>(new URL(`${base}.json`, REPORTS_DIR));
  const raw = readJson<RawRun>(new URL(`${base}.json`, RAW_DIR));
  const transcripts = new Map(
    raw.transcripts.map((item) => [`${item.caseId}#${item.repeat}`, item]),
  );
  const results = report.results.map((result): CaseResult => {
    const stored = transcripts.get(`${result.caseId}#${result.repeat}`);
    const evalCase = cases.get(result.caseId);
    if (!stored || !evalCase) return result;
    const context = { context: raw.context, judge: result.judge };
    return rescoreCase(evalCase, result.repeat, stored.transcript, context);
  });
  const rescored = {
    meta: { ...report.meta, label: `${report.meta.label}-recalificado` },
    summary: summarize(results),
    results,
  };
  writeReport(`${base}-recalificado`, rescored);
  console.log(
    `${base}: ${report.summary.meanScore?.toFixed(2)} → ${rescored.summary.meanScore?.toFixed(2)} · puertas ${report.summary.hardGateFailures} → ${rescored.summary.hardGateFailures}`,
  );
  return rescored;
}

const reports = positionals.map(rescoreRun);
if (values.compare) {
  const rows = reports.map(modelRow);
  const title = `Comparación de modelos (${values.compare}, recalificada)`;
  writeFileSync(
    new URL(`${values.compare}.md`, REPORTS_DIR),
    renderComparison(title, rows, decide(rows)),
  );
  console.log(`Comparación → evals/reports/${values.compare}.md`);
}
