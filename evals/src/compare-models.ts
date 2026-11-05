/**
 * ES: Comparación de modelos (08 §5, IMP-52): corre el mismo set con cada modelo de
 *     evals/models.json, uno tras otro, y escribe un reporte por modelo y uno comparativo.
 *     Uso: pnpm compare -- --smoke   (6 escenarios y el ejemplo, una vez por modelo)
 *          pnpm compare -- --full    (todos los casos, con las repeticiones de models.json)
 *     Opcional: --model id (repetible) para limitar los modelos y --concurrency n.
 * EN: Model comparison (08 §5, IMP-52): runs the same set with every model in
 *     evals/models.json, one after another, and writes one report per model and a
 *     comparative one.
 *     Usage: pnpm compare -- --smoke   (6 scenarios and the example, once per model)
 *            pnpm compare -- --full    (all cases, with the repeats in models.json)
 *     Optional: --model id (repeatable) to limit the models and --concurrency n.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { z } from "zod";
import { loadCases } from "./cases/load-cases";
import { localDate, REPORTS_DIR, runEvaluation, writeReport } from "./evaluation";
import { decide, modelRow, renderComparison } from "./report/compare";

const ModelsFile = z.object({
  judge: z.string(),
  models: z.array(
    z.object({ id: z.string(), label: z.string(), repeats: z.number().int().min(1) }),
  ),
});

const SMOKE_GROUPS = new Set(["scenario", "example"]);

const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== "--"),
  options: {
    smoke: { type: "boolean", default: false },
    full: { type: "boolean", default: false },
    model: { type: "string", multiple: true, default: [] },
    concurrency: { type: "string", default: "2" },
  },
});
if (values.smoke === values.full) throw new Error("Indica --smoke o --full.");

const config = ModelsFile.parse(
  JSON.parse(readFileSync(new URL("../models.json", import.meta.url), "utf8")),
);
const models = config.models.filter(
  (model) => values.model.length === 0 || values.model.includes(model.id),
);
const all = loadCases();
const cases = values.smoke ? all.filter((item) => SMOKE_GROUPS.has(item.group)) : all;
const kind = values.smoke ? "humo" : "completa";
const date = localDate();

const rows = [];
for (const model of models) {
  const label = `compare-${kind}-${model.label}`;
  const report = await runEvaluation({
    cases,
    model: model.id,
    judge: config.judge,
    repeats: values.smoke ? 1 : model.repeats,
    concurrency: Number(values.concurrency),
    label,
  });
  writeReport(`${date}-${label}`, report, report.raw);
  rows.push(modelRow(report));
}

const decision = decide(rows);
const title = `Comparación de modelos (${kind}) · ${date}`;
const base = `${date}-compare-${kind}`;
writeFileSync(new URL(`${base}.md`, REPORTS_DIR), renderComparison(title, rows, decision));
writeFileSync(
  new URL(`${base}.json`, REPORTS_DIR),
  `${JSON.stringify({ title, rows, decision }, null, 2)}\n`,
);
console.log(
  `${title}: ${decision.winner?.model ?? "sin modelo elegible"} → evals/reports/${base}.md`,
);
