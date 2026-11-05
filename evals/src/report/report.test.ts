import { describe, expect, it } from "vitest";
import { loadCases } from "../cases/load-cases";
import { serviceFailure, type CaseResult } from "../evaluate-case";
import { parseRunOptions, selectCases } from "../run-options";
import { renderMarkdown } from "./markdown";
import { percentile, summarize } from "./summary";

const result = (
  caseId: string,
  score: number,
  overrides: Partial<CaseResult> = {},
): CaseResult => ({
  caseId,
  group: "scenario",
  title: caseId,
  repeat: 1,
  gates: [],
  writes: 0,
  score: {
    score,
    components: { figures: 1, sourced: 1, control: 1, trajectory: 1, format: 1, judge: null },
  },
  checks: {
    figureAccuracy: 1,
    missingFigures: [],
    unsourced: [],
    periodDeclared: true,
    trajectory: 1,
    missingTools: [],
    forbiddenToolsUsed: [],
    format: 1,
    missingBlocks: [],
    forbiddenBlocks: [],
    control: 1,
    writeViolation: false,
    behavior: 1,
    behaviorFailures: [],
  },
  usage: {
    agentCostUsd: 0.002,
    judgeCostUsd: 0.0004,
    tokensIn: 1000,
    tokensOut: 100,
    llmCalls: 3,
    requests: 1,
    firstTextMs: 8000,
    totalMs: 30000,
    streamErrors: [],
  },
  ...overrides,
});

describe("resumen y reporte", () => {
  it("calcula percentiles sobre los valores ordenados", () => {
    expect(percentile([30, 10, 20, 40], 50)).toBe(20);
    expect(percentile([30, 10, 20, 40], 95)).toBe(40);
    expect(percentile([], 50)).toBeNull();
  });

  it("resume puntaje, puertas, costo y omitidos", () => {
    const summary = summarize([
      result("E-01", 1),
      result("E-02", 0.5, { gates: ["cifras sin fuente: 850"] }),
      {
        ...result("MEM-01", 0),
        score: undefined,
        usage: undefined,
        skipped: "Requiere memory (M7)",
      },
    ]);
    expect(summary).toMatchObject({ ran: 2, skipped: 1, meanScore: 0.75, hardGateFailures: 1 });
    expect(summary.agentCostUsd).toBeCloseTo(0.004);
  });

  it("el reporte muestra las metas y la fila de cada caso", () => {
    const meta = {
      date: "2026-11-04",
      label: "humo",
      model: "z-ai/glm-5.3-flash",
      judgeModel: null,
      commit: "abc1234",
      promptVersion: "0123456789ab",
      dataAsOf: "2026-10-31",
      repeats: 1,
    };
    const results = [result("E-01", 0.95)];
    const markdown = renderMarkdown(meta, summarize(results), results);
    expect(markdown).toContain("| Puntaje medio (± desv.) | 0.95");
    expect(markdown).toContain("| E-01 | 0.95 | ✅");
  });
});

describe("opciones de la corrida", () => {
  it("usa el modelo del entorno, el juez decidido y filtra por grupo", () => {
    const options = parseRunOptions(["--group", "negative"], {
      OPENROUTER_MODEL: "z-ai/glm-5.3-flash",
    });
    expect(options).toMatchObject({
      judge: "minimax/minimax-m3.1-flash",
      repeats: 1,
      label: "glm-5.3-flash",
    });
    expect(selectCases(loadCases(), options).map((item) => item.id)).toEqual([
      "CA-N01",
      "CA-N02",
      "CA-N03",
      "CA-N04",
      "CA-N09",
    ]);
  });

  it("rechaza casos que no existen y repeticiones inválidas", () => {
    const env = { OPENROUTER_MODEL: "m" };
    expect(() => selectCases(loadCases(), parseRunOptions(["--case", "E-99"], env))).toThrow(
      "E-99",
    );
    expect(() => parseRunOptions(["--repeat", "0"], env)).toThrow("inválido");
  });
});

describe("respuestas vacías por error del servicio", () => {
  const transcript = (errors: string[]) =>
    ({
      requests: [{ turn: 0, steps: [], totals: undefined, firstTextMs: null, totalMs: 1, errors }],
    }) as unknown as Parameters<typeof serviceFailure>[0];
  const empty = { text: "", blocks: [] } as unknown as Parameters<typeof serviceFailure>[1];

  it("se reportan como error y no se califican", () => {
    expect(serviceFailure(transcript(["Invalid API parameter"]), empty)).toBe(
      "Sin respuesta por error del servicio: Invalid API parameter",
    );
  });

  it("una respuesta con contenido sí se califica aunque haya habido un error", () => {
    const answered = { text: "Vendiste $808,254", blocks: [] } as unknown as Parameters<
      typeof serviceFailure
    >[1];
    expect(serviceFailure(transcript(["x"]), answered)).toBeUndefined();
    expect(serviceFailure(transcript([]), empty)).toBeUndefined();
  });
});
