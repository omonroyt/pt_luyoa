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
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { agentConfig, createAgentModel } from "@alborada/web/agent";
import { loadCriteria } from "./cases/criteria";
import { loadCases } from "./cases/load-cases";
import { evaluateCase, type CaseResult } from "./evaluate-case";
import { createGoldenApi } from "./golden/api-client";
import { renderMarkdown, type RunMeta } from "./report/markdown";
import { summarize } from "./report/summary";
import { parseRunOptions, selectCases } from "./run-options";

const REPORTS_DIR = new URL("../reports/", import.meta.url);
const PROMPT_FILE = new URL("../../apps/web/lib/agent/system-prompt.ts", import.meta.url);
const HASH_LENGTH = 12;

function commitOf(): string {
  const head = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  const dirty = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim();
  return dirty ? `${head}+cambios` : head;
}

const promptVersion = () =>
  createHash("sha256").update(readFileSync(PROMPT_FILE)).digest("hex").slice(0, HASH_LENGTH);

async function pool<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  const results: T[] = new Array<T>(tasks.length);
  let next = 0;
  const worker = async () => {
    for (let index = next++; index < tasks.length; index = next++) {
      results[index] = await (tasks[index] as () => Promise<T>)();
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

const options = parseRunOptions(
  process.argv.slice(2).filter((arg) => arg !== "--"),
  process.env,
);
const cases = selectCases(loadCases(), options);
const { openRouterApiKey } = agentConfig({ ...process.env, OPENROUTER_MODEL: options.model });
const api = {
  apiKey: process.env.LUYOA_API_KEY ?? "",
  apiBaseUrl: process.env.LUYOA_API_BASE_URL ?? "https://prueba-developer.luyoa.dev",
};
const business = await createGoldenApi().get<{ id: string; data_as_of: string }>("/v1/business");
const deps = {
  model: createAgentModel({ apiKey: openRouterApiKey, modelId: options.model }),
  judge: options.judge
    ? createAgentModel({ apiKey: openRouterApiKey, modelId: options.judge })
    : undefined,
  api,
  businessId: business.id,
  criteria: loadCriteria(),
};

const runnable = cases.filter((item) => item.requires.length === 0).length;
console.log(
  `Modelo ${options.model} · juez ${options.judge ?? "ninguno"} · ${runnable} casos × ${options.repeats} = ${runnable * options.repeats} conversaciones`,
);

const tasks = cases.flatMap((evalCase) =>
  Array.from({ length: options.repeats }, (_, repeat) => async (): Promise<CaseResult> => {
    const result = await evaluateCase(evalCase, repeat + 1, deps);
    const status = result.skipped ?? result.error ?? `puntaje ${result.score?.score.toFixed(2)}`;
    console.log(
      `${evalCase.id} #${repeat + 1}: ${status}${result.gates.length ? " · PUERTA DURA" : ""}`,
    );
    return result;
  }),
);
const results = await pool(tasks, options.concurrency);

// ES: Fecha local del negocio (en-CA da AAAA-MM-DD), no la de UTC.
// EN: Business local date (en-CA yields YYYY-MM-DD), not the UTC one.
const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(
  new Date(),
);
const meta: RunMeta = {
  date,
  label: options.label,
  model: options.model,
  judgeModel: options.judge,
  commit: commitOf(),
  promptVersion: promptVersion(),
  dataAsOf: business.data_as_of,
  repeats: options.repeats,
};
const summary = summarize(results);
mkdirSync(REPORTS_DIR, { recursive: true });
const base = `${date}-${options.label}`;
writeFileSync(
  new URL(`${base}.json`, REPORTS_DIR),
  `${JSON.stringify({ meta, summary, results }, null, 2)}\n`,
);
writeFileSync(new URL(`${base}.md`, REPORTS_DIR), renderMarkdown(meta, summary, results));
console.log(
  `Puntaje medio ${summary.meanScore?.toFixed(2) ?? "—"} · costo ${summary.agentCostUsd.toFixed(4)} USD → evals/reports/${base}.md`,
);
