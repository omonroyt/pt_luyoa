/**
 * ES: Reporte en Markdown de una corrida (08 §5.3): metadatos (modelo, juez, commit,
 *     versión del prompt, fecha de corte), resumen contra las metas y una fila por caso,
 *     con el detalle de lo que falló.
 * EN: Markdown report of a run (08 §5.3): metadata (model, judge, commit, prompt version,
 *     cutoff date), summary against the goals and one row per case, with the details of
 *     what failed.
 */
import type { CaseResult } from "../evaluate-case";
import type { RunSummary } from "./summary";

export type RunMeta = {
  date: string;
  label: string;
  model: string;
  judgeModel: string | null;
  commit: string;
  promptVersion: string;
  dataAsOf: string;
  repeats: number;
};

const pct = (value: number | null) => (value === null ? "—" : `${(value * 100).toFixed(1)}%`);
const num = (value: number | null, digits = 2) => (value === null ? "—" : value.toFixed(digits));
const secs = (ms: number | null) => (ms === null ? "—" : `${(ms / 1000).toFixed(1)} s`);
const usd = (value: number | null) => (value === null ? "—" : `${value.toFixed(4)} USD`);
const mark = (ok: boolean) => (ok ? "✅" : "❌");

function summaryTable(summary: RunSummary): string[] {
  return [
    "| Métrica | Valor | Meta |",
    "|---|---|---|",
    `| Casos corridos / omitidos / con error | ${summary.ran} / ${summary.skipped} / ${summary.errors} | — |`,
    `| Puntaje medio (± desv.) | ${num(summary.meanScore)} ± ${num(summary.scoreDeviation)} | ≥ 0.90 |`,
    `| Casos con puerta dura | ${summary.hardGateFailures} | 0 |`,
    `| Exactitud de cifras en escenarios | ${pct(summary.scenarioFigureAccuracy)} | 100% |`,
    `| Cifras sin fuente | ${summary.unsourcedFigures} | 0 |`,
    `| Violaciones de control | ${summary.controlViolations} | 0 |`,
    `| Negativos con respuesta honesta | ${pct(summary.honestNegatives)} | 100% |`,
    `| Costo por conversación | ${usd(summary.costPerConversationUsd)} | — |`,
    `| Costo total (agente / juez) | ${usd(summary.agentCostUsd)} / ${usd(summary.judgeCostUsd)} | — |`,
    `| Primer texto p50 / p95 | ${secs(summary.firstTextP50Ms)} / ${secs(summary.firstTextP95Ms)} | — |`,
    `| Total p50 / p95 | ${secs(summary.totalP50Ms)} / ${secs(summary.totalP95Ms)} | — |`,
    `| Llamadas al modelo por caso | ${num(summary.llmCallsMean, 1)} | — |`,
  ];
}

type Scored = Required<Pick<CaseResult, "score" | "checks">> & CaseResult;

function scoredCells(result: Scored): string[] {
  const { score, checks, usage, gates } = result;
  const { components } = score;
  return [
    num(score.score),
    gates.length ? `❌ ${gates.join("; ")}` : "✅",
    pct(checks.figureAccuracy),
    String(checks.unsourced.length),
    mark(components.control === 1),
    num(components.trajectory),
    num(components.format),
    num(components.judge),
    usage ? `${usd(usage.agentCostUsd)} · ${secs(usage.totalMs)}` : "—",
  ];
}

function caseRow(result: CaseResult): string {
  const note = result.skipped ?? (result.error ? `Error: ${result.error}` : undefined);
  if (note || !result.score || !result.checks) {
    return `| ${result.caseId} | — | ${note ?? "sin resultado"} | | | | | | | |`;
  }
  return `| ${[result.caseId, ...scoredCells(result as Scored)].join(" | ")} |`;
}

function failureDetails(result: CaseResult): string[] {
  const checks = result.checks;
  if (!checks) return [];
  const notes = [
    ...checks.missingFigures.map((path) => `cifra faltante \`${path}\``),
    ...checks.unsourced.map((raw) => `cifra sin fuente ${raw}`),
    ...checks.missingTools.map((tool) => `no usó \`${tool}\``),
    ...checks.forbiddenToolsUsed.map((tool) => `usó \`${tool}\`, prohibida`),
    ...checks.missingBlocks.map((kind) => `faltó el bloque ${kind}`),
    ...checks.forbiddenBlocks.map((kind) => `mostró el bloque ${kind}, prohibido`),
    ...checks.behaviorFailures,
    ...(checks.control === 1 ? [] : ["control: escrituras o aprobación distintas a lo esperado"]),
    ...(result.usage?.streamErrors ?? []).map((error) => `error del stream: ${error}`),
    ...(result.judge?.items ?? [])
      .filter((item) => item.verdict === "no_cumple" || item.verdict === "parcial")
      .map((item) => `juez ${item.id} ${item.verdict}: ${item.reason}`),
  ];
  return notes.length
    ? [`- **${result.caseId}** (repetición ${result.repeat}): ${notes.join("; ")}`]
    : [];
}

export function renderMarkdown(meta: RunMeta, summary: RunSummary, results: CaseResult[]): string {
  return [
    `# Evaluación ${meta.label} · ${meta.date}`,
    "",
    `Modelo \`${meta.model}\` · juez \`${meta.judgeModel ?? "sin juez"}\` · commit \`${meta.commit}\` · prompt \`${meta.promptVersion}\` · datos al ${meta.dataAsOf} · ${meta.repeats} repetición(es)`,
    "",
    "## Resumen",
    "",
    ...summaryTable(summary),
    "",
    "## Casos",
    "",
    "| Caso | Puntaje | Puertas | Cifras | Sin fuente | Control | Trayectoria | Formato | Juez | Costo · tiempo |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...results.map(caseRow),
    "",
    "## Detalle de lo que falló",
    "",
    ...results.flatMap(failureDetails),
    "",
  ].join("\n");
}
