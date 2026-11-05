import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { parseCase } from "../cases/load-cases";
import type { Checks } from "./checks";
import type { Extracted } from "./extract";
import { DIMENSIONS, judgeCase, judgePrompt, judgeScore } from "./judge";
import { hardGateFailures, scoreCase } from "./score";

const evalCase = parseCase(
  `id: E-05
group: scenario
title: "x"
criteria: ["CA-E05-1"]
turns:
  - user: "¿Qué campañas me han funcionado mejor?"
expect:
  rubric: ["CA-E05-2"]
`,
  "e.yaml",
);

const extracted: Extracted = {
  text: "La mejor fue Te extrañamos, con +23.9 pts de lift.",
  userText: "",
  blocks: [],
  steps: [],
  toolsUsed: ["campaign_performance"],
  mcpOutputs: [{ data: { lift_points: 23.9 } }],
};

const perfect: Checks = {
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
};

const judgeModel = (text: string) =>
  new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 5, text: 5, reasoning: 0 },
      },
      providerMetadata: { openrouter: { usage: { cost: 0.0004 } } },
      warnings: [],
    }),
  });

describe("juez", () => {
  it("arma el prompt con el texto de los criterios y las cinco dimensiones", () => {
    const prompt = judgePrompt(
      evalCase,
      extracted,
      new Map([["CA-E05-2", "Separa campañas sin control"]]),
    );
    expect(prompt).toContain("CA-E05-2: Separa campañas sin control");
    for (const dimension of Object.keys(DIMENSIONS)) expect(prompt).toContain(dimension);
    expect(prompt).toContain("23.9");
  });

  it("promedia los veredictos y no cuenta los que no aplican", () => {
    expect(
      judgeScore([
        { id: "a", verdict: "cumple", reason: "" },
        { id: "b", verdict: "parcial", reason: "" },
        { id: "c", verdict: "no_aplica", reason: "" },
      ]),
    ).toBe(0.75);
  });

  it("lee la salida estructurada del modelo y su costo", async () => {
    const reply = JSON.stringify({
      items: [{ id: "CA-E05-2", verdict: "cumple", reason: "Separa" }],
    });
    const result = await judgeCase(judgeModel(reply), evalCase, extracted, new Map());
    expect(result).toMatchObject({ score: 1, costUsd: 0.0004 });
  });

  it("si el juez responde algo inválido, el caso queda sin juez en lugar de romper la corrida", async () => {
    const result = await judgeCase(judgeModel("no es json"), evalCase, extracted, new Map());
    expect(result.score).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

describe("puntaje y puertas duras", () => {
  it("un caso perfecto vale 1 y sin juez se reparten los pesos", () => {
    expect(scoreCase(perfect, 1).score).toBeCloseTo(1);
    expect(scoreCase({ ...perfect, figureAccuracy: 0.5 }, null).score).toBeCloseTo(1 - 0.2 / 0.9);
  });

  it("una cifra sin fuente reprueba un escenario pero no un negativo", () => {
    const checks = { ...perfect, unsourced: ["1,584,058"] };
    expect(hardGateFailures(evalCase, checks)).toEqual(["cifras sin fuente: 1,584,058"]);
    expect(hardGateFailures({ ...evalCase, group: "negative" }, checks)).toEqual([]);
  });

  it("una escritura sin aprobación reprueba cualquier caso", () => {
    expect(
      hardGateFailures({ ...evalCase, group: "fault" }, { ...perfect, writeViolation: true }),
    ).toEqual(["escritura sin aprobación"]);
  });
});
