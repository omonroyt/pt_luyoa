/**
 * ES: Reporte de la comparación de modelos (08 §5.3) y regla de decisión (§5.4): se
 *     descartan los modelos con puertas duras; entre los demás gana el mejor puntaje, y si
 *     uno más barato queda a menos de 0.03 del mejor, se prefiere el barato.
 * EN: Model comparison report (08 §5.3) and decision rule (§5.4): models with hard gates
 *     are discarded; among the rest the best score wins, and if a cheaper one is within
 *     0.03 of the best, the cheaper one is preferred.
 */
import type { RunReport } from "../evaluation";

export const CHEAPER_MARGIN = 0.03;

export type ModelRow = {
  model: string;
  label: string;
  repeats: number;
  meanScore: number | null;
  scoreDeviation: number | null;
  hardGateFailures: number;
  errors: number;
  costPerConversationUsd: number | null;
  firstTextP50Ms: number | null;
  firstTextP95Ms: number | null;
  totalP50Ms: number | null;
  totalP95Ms: number | null;
  llmCallsMean: number | null;
};

export function modelRow(report: RunReport): ModelRow {
  const { meta, summary } = report;
  return {
    model: meta.model,
    label: meta.label,
    repeats: meta.repeats,
    meanScore: summary.meanScore,
    scoreDeviation: summary.scoreDeviation,
    hardGateFailures: summary.hardGateFailures,
    errors: summary.errors,
    costPerConversationUsd: summary.costPerConversationUsd,
    firstTextP50Ms: summary.firstTextP50Ms,
    firstTextP95Ms: summary.firstTextP95Ms,
    totalP50Ms: summary.totalP50Ms,
    totalP95Ms: summary.totalP95Ms,
    llmCallsMean: summary.llmCallsMean,
  };
}

export type Decision = { winner: ModelRow | undefined; reasons: string[] };

const cost = (row: ModelRow) => row.costPerConversationUsd ?? Number.POSITIVE_INFINITY;

export function decide(rows: ModelRow[]): Decision {
  const reasons = rows
    .filter((row) => row.hardGateFailures > 0 || row.errors > 0)
    .map(
      (row) =>
        `${row.label}: descartado (${row.hardGateFailures} casos con puerta dura, ${row.errors} con error)`,
    );
  const eligible = rows.filter((row) => row.hardGateFailures === 0 && row.errors === 0);
  const best = [...eligible].sort((a, b) => (b.meanScore ?? 0) - (a.meanScore ?? 0))[0];
  if (!best)
    return { winner: undefined, reasons: [...reasons, "Ningún modelo pasa las puertas duras."] };
  const cheaper = eligible
    .filter(
      (row) =>
        (best.meanScore ?? 0) - (row.meanScore ?? 0) < CHEAPER_MARGIN && cost(row) < cost(best),
    )
    .sort((a, b) => cost(a) - cost(b))[0];
  const winner = cheaper ?? best;
  const why = cheaper
    ? `${cheaper.label} queda a menos de ${CHEAPER_MARGIN} de ${best.label} y cuesta menos`
    : `${best.label} tiene el mejor puntaje entre los que pasan las puertas duras`;
  return { winner, reasons: [...reasons, why] };
}

const num = (value: number | null, digits = 2) => (value === null ? "—" : value.toFixed(digits));
const secs = (ms: number | null) => (ms === null ? "—" : (ms / 1000).toFixed(1));

export function renderComparison(title: string, rows: ModelRow[], decision: Decision): string {
  const table = rows.map(
    (row) =>
      `| \`${row.model}\` | ${num(row.meanScore)} ± ${num(row.scoreDeviation)} | ${row.hardGateFailures} | ${row.errors} | ${num(row.costPerConversationUsd, 4)} | ${secs(row.firstTextP50Ms)} / ${secs(row.firstTextP95Ms)} | ${secs(row.totalP50Ms)} / ${secs(row.totalP95Ms)} | ${num(row.llmCallsMean, 1)} |`,
  );
  return [
    `# ${title}`,
    "",
    "| Modelo | Puntaje (media ± desv.) | Casos con puerta dura | Errores | Costo / conversación (USD) | Primer texto p50 / p95 (s) | Total p50 / p95 (s) | Llamadas al modelo |",
    "|---|---|---|---|---|---|---|---|",
    ...table,
    "",
    "## Regla de decisión (08 §5.4)",
    "",
    ...decision.reasons.map((reason) => `- ${reason}`),
    "",
    decision.winner
      ? `**Elegido según la regla:** \`${decision.winner.model}\``
      : "**Sin modelo elegible.**",
    "",
  ].join("\n");
}
