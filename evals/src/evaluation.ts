/**
 * ES: Una corrida de evaluación con un modelo: arma las dependencias, evalúa los casos con
 *     concurrencia, resume y escribe el reporte. La usan pnpm eval y la comparación de
 *     modelos, así que cada modelo se mide con exactamente el mismo código.
 * EN: One evaluation run with a model: it builds the dependencies, evaluates the cases with
 *     concurrency, summarizes and writes the report. Both pnpm eval and the model
 *     comparison use it, so every model is measured with exactly the same code.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { MESSAGE_LIMITS } from "@alborada/shared";
import { agentConfig, createAgentModel } from "@alborada/web/agent";
import type { EvalCase } from "./cases/case-schema";
import { loadCriteria } from "./cases/criteria";
import { evaluateCase, type CaseResult } from "./evaluate-case";
import type { CaseTranscript } from "./runner/run-case";
import { createGoldenApi } from "./golden/api-client";
import { renderMarkdown, type RunMeta } from "./report/markdown";
import { summarize, type RunSummary } from "./report/summary";

export const REPORTS_DIR = new URL("../reports/", import.meta.url);
const PROMPT_FILE = new URL("../../apps/web/lib/agent/system-prompt.ts", import.meta.url);
const HASH_LENGTH = 12;

export type RunRequest = {
  cases: EvalCase[];
  model: string;
  judge: string | null;
  repeats: number;
  concurrency: number;
  label: string;
};

export type RunReport = { meta: RunMeta; summary: RunSummary; results: CaseResult[] };

// ES: Transcripciones completas de una corrida, con el contexto usado para calificarlas.
//     Se guardan fuera de git (evals/reports/raw/) por su tamaño.
// EN: Full transcripts of a run, with the context used to score them. They are stored
//     outside git (evals/reports/raw/) because of their size.
export type RawRun = {
  context: unknown[];
  transcripts: Array<{ caseId: string; repeat: number; transcript: CaseTranscript }>;
};
export const RAW_DIR = new URL("raw/", REPORTS_DIR);

function commitOf(): string {
  const head = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  const dirty = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim();
  return dirty ? `${head}+cambios` : head;
}

const promptVersion = () =>
  createHash("sha256").update(readFileSync(PROMPT_FILE)).digest("hex").slice(0, HASH_LENGTH);

// ES: Fecha local del negocio (en-CA da AAAA-MM-DD), no la de UTC.
// EN: Business local date (en-CA yields YYYY-MM-DD), not the UTC one.
export const localDate = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());

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

async function dependencies(request: RunRequest) {
  const { openRouterApiKey } = agentConfig({ ...process.env, OPENROUTER_MODEL: request.model });
  const api = createGoldenApi();
  const business = await api.get<{ id: string; data_as_of: string }>("/v1/business");
  const segments = await api.get<unknown>("/v1/segments");
  const model = (modelId: string) => createAgentModel({ apiKey: openRouterApiKey, modelId });
  const deps = {
    model: model(request.model),
    judge: request.judge ? model(request.judge) : undefined,
    api: {
      apiKey: process.env.LUYOA_API_KEY ?? "",
      apiBaseUrl: process.env.LUYOA_API_BASE_URL ?? "https://prueba-developer.luyoa.dev",
    },
    businessId: business.id,
    criteria: loadCriteria(),
    // ES: Contexto del prompt y de las descripciones de herramientas (límites por canal).
    // EN: Prompt and tool-description context (per-channel limits).
    context: [business, segments, { message_limits: MESSAGE_LIMITS }],
  };
  return { deps, dataAsOf: business.data_as_of };
}

export function writeReport(base: string, report: RunReport, raw?: RawRun): void {
  mkdirSync(REPORTS_DIR, { recursive: true });
  if (raw) {
    mkdirSync(RAW_DIR, { recursive: true });
    writeFileSync(new URL(`${base}.json`, RAW_DIR), JSON.stringify(raw));
  }
  writeFileSync(new URL(`${base}.json`, REPORTS_DIR), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    new URL(`${base}.md`, REPORTS_DIR),
    renderMarkdown(report.meta, report.summary, report.results),
  );
}

export async function runEvaluation(request: RunRequest): Promise<RunReport & { raw: RawRun }> {
  const { deps: base, dataAsOf } = await dependencies(request);
  const raw: RawRun = { context: base.context, transcripts: [] };
  const deps = {
    ...base,
    onTranscript: (caseId: string, repeat: number, transcript: CaseTranscript) =>
      raw.transcripts.push({ caseId, repeat, transcript }),
  };
  const runnable = request.cases.filter((item) => item.requires.length === 0).length;
  console.log(
    `Modelo ${request.model} · juez ${request.judge ?? "ninguno"} · ${runnable} casos × ${request.repeats} = ${runnable * request.repeats} conversaciones`,
  );
  const tasks = request.cases.flatMap((evalCase) =>
    Array.from({ length: request.repeats }, (_, repeat) => async () => {
      const result = await evaluateCase(evalCase, repeat + 1, deps);
      const status = result.skipped ?? result.error ?? `puntaje ${result.score?.score.toFixed(2)}`;
      const gate = result.gates.length ? " · PUERTA DURA" : "";
      console.log(`${request.label} ${evalCase.id} #${repeat + 1}: ${status}${gate}`);
      return result;
    }),
  );
  const results = await pool(tasks, request.concurrency);
  const meta: RunMeta = {
    date: localDate(),
    label: request.label,
    model: request.model,
    judgeModel: request.judge,
    commit: commitOf(),
    promptVersion: promptVersion(),
    dataAsOf,
    repeats: request.repeats,
  };
  return { meta, summary: summarize(results), results, raw };
}
