import { describe, expect, it } from "vitest";
import { createBudget } from "./budget";
import { addRepetition, emptyRuns } from "./report/merge-runs";
import type { RawRun, RunReport } from "./evaluation";

describe("tope de gasto", () => {
  it("deja de iniciar conversaciones al llegar al tope y estima si una repetición cabe", () => {
    const budget = createBudget(1.5);
    expect(budget.fits(1.2)).toBe(true);
    budget.add(1.2);
    expect(budget.canStart()).toBe(true);
    expect(budget.fits(0.4)).toBe(false);
    budget.add(0.31);
    expect(budget.canStart()).toBe(false);
    expect(budget.spentUsd()).toBeCloseTo(1.51);
  });
});

describe("repeticiones intercaladas", () => {
  const run = (cost: number): RunReport & { raw: RawRun } => ({
    meta: {
      date: "2026-11-04",
      label: "x",
      model: "m",
      judgeModel: null,
      commit: "c",
      promptVersion: "p",
      dataAsOf: "2026-10-31",
      repeats: 1,
    },
    summary: { agentCostUsd: cost, judgeCostUsd: 0.01 } as RunReport["summary"],
    results: [{ caseId: "E-01", group: "scenario", title: "t", repeat: 1, gates: [], writes: 0 }],
    raw: { context: [], transcripts: [] },
  });

  it("junta las repeticiones con su número y recuerda lo que costó la última", () => {
    const first = addRepetition(emptyRuns(), run(0.2), 1);
    const second = addRepetition(first, run(0.3), 2);
    expect(second.report?.results.map((result) => result.repeat)).toEqual([1, 2]);
    expect(second.report?.meta.repeats).toBe(2);
    expect(second.lastCostUsd).toBeCloseTo(0.31);
  });
});
