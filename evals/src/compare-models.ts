/**
 * ES: Comparación de modelos (08 §5, IMP-52): corre el mismo set con cada modelo de
 *     evals/models.json, uno tras otro, y escribe un reporte por modelo y uno comparativo.
 *     Uso: pnpm compare -- --smoke   (6 escenarios y el ejemplo, una vez por modelo)
 *          pnpm compare -- --full    (todos los casos, con las repeticiones de models.json)
 *     Opcional: --model id (repetible) para limitar los modelos, --concurrency n y
 *     --max-usd n: tope de gasto (agente + juez). Las repeticiones se intercalan entre
 *     modelos y una repetición solo empieza si cabe en el tope para todos.
 * EN: Model comparison (08 §5, IMP-52): runs the same set with every model in
 *     evals/models.json, one after another, and writes one report per model and a
 *     comparative one.
 *     Usage: pnpm compare -- --smoke   (6 scenarios and the example, once per model)
 *            pnpm compare -- --full    (all cases, with the repeats in models.json)
 *     Optional: --model id (repeatable) to limit the models, --concurrency n and
 *     --max-usd n: spending cap (agent + judge). Repetitions are interleaved across
 *     models and a repetition only starts if it fits in the cap for all of them.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { z } from "zod";
import { createBudget } from "./budget";
import { loadCases } from "./cases/load-cases";
import { localDate, REPORTS_DIR, runEvaluation, writeReport } from "./evaluation";
import { decide, modelRow, renderComparison } from "./report/compare";
import { addRepetition, emptyRuns } from "./report/merge-runs";

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
    "max-usd": { type: "string" },
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

const budget = values["max-usd"] ? createBudget(Number(values["max-usd"])) : undefined;
const runs = new Map(models.map((model) => [model.id, emptyRuns()]));
const labelOf = (model: (typeof models)[number]) => `compare-${kind}-${model.label}`;
const maxRepetitions = values.smoke ? 1 : Math.max(...models.map((model) => model.repeats));

// ES: Una repetición empieza solo si, según lo que costó la anterior, cabe para todos.
// EN: A repetition only starts if, by what the previous one cost, it fits for all models.
const repetitionFits = (repetition: number) => {
  const pending = models.filter((model) => values.smoke || repetition <= model.repeats);
  const estimate = pending.reduce((sum, model) => sum + (runs.get(model.id)?.lastCostUsd ?? 0), 0);
  return { pending, fits: !budget || (budget.canStart() && budget.fits(estimate)) };
};

for (let repetition = 1; repetition <= maxRepetitions; repetition += 1) {
  const { pending, fits } = repetitionFits(repetition);
  if (!fits) {
    console.log(`Repetición ${repetition} omitida: no cabe en el tope de ${budget?.maxUsd} USD.`);
    break;
  }
  for (const model of pending) {
    const run = await runEvaluation({
      cases,
      model: model.id,
      judge: config.judge,
      repeats: 1,
      concurrency: Number(values.concurrency),
      label: labelOf(model),
      budget,
    });
    runs.set(model.id, addRepetition(runs.get(model.id) ?? emptyRuns(), run, repetition));
  }
}

const rows = [];
for (const model of models) {
  const { report, raw } = runs.get(model.id) ?? emptyRuns();
  if (!report) continue;
  writeReport(`${date}-${labelOf(model)}`, report, raw);
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
if (budget)
  console.log(`Gasto de la corrida: ${budget.spentUsd().toFixed(4)} USD de ${budget.maxUsd}`);
