/**
 * ES: Junta repeticiones corridas por separado en un solo reporte por modelo. La
 *     comparación intercala las repeticiones (la 1 de cada modelo, luego la 2…) para que,
 *     si el presupuesto se agota, todos los modelos queden con las mismas repeticiones.
 * EN: Merges repetitions run separately into one report per model. The comparison
 *     interleaves repetitions (repetition 1 of every model, then 2…) so that, if the
 *     budget runs out, every model ends with the same repetitions.
 */
import type { RawRun, RunReport } from "../evaluation";
import { summarize } from "./summary";

export type ModelRuns = {
  report: RunReport | undefined;
  raw: RawRun;
  repetitions: number;
  lastCostUsd: number;
};

export const emptyRuns = (): ModelRuns => ({
  report: undefined,
  raw: { context: [], transcripts: [] },
  repetitions: 0,
  lastCostUsd: 0,
});

export function addRepetition(
  runs: ModelRuns,
  run: RunReport & { raw: RawRun },
  repetition: number,
): ModelRuns {
  const results = run.results.map((result) => ({ ...result, repeat: repetition }));
  const transcripts = run.raw.transcripts.map((item) => ({ ...item, repeat: repetition }));
  const previous = runs.report?.results ?? [];
  const merged = [...previous, ...results];
  return {
    report: {
      meta: { ...run.meta, repeats: repetition },
      summary: summarize(merged),
      results: merged,
    },
    raw: { context: run.raw.context, transcripts: [...runs.raw.transcripts, ...transcripts] },
    repetitions: repetition,
    lastCostUsd: run.summary.agentCostUsd + run.summary.judgeCostUsd,
  };
}
