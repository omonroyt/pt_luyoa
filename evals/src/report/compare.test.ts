import { describe, expect, it } from "vitest";
import { decide, renderComparison, type ModelRow } from "./compare";

type Extra = { gates?: number; errors?: number };

const row = (label: string, meanScore: number, cost: number, extra: Extra = {}): ModelRow => ({
  model: `familia/${label}`,
  label,
  repeats: 1,
  meanScore,
  scoreDeviation: 0.05,
  hardGateFailures: extra.gates ?? 0,
  errors: extra.errors ?? 0,
  costPerConversationUsd: cost,
  firstTextP50Ms: 5000,
  firstTextP95Ms: 9000,
  totalP50Ms: 20000,
  totalP95Ms: 40000,
  llmCallsMean: 4,
});

describe("regla de decisión de la comparación", () => {
  it("descarta los modelos con puertas duras o errores y elige el mejor puntaje", () => {
    const decision = decide([
      row("a", 0.95, 0.01, { gates: 1 }),
      row("b", 0.9, 0.02),
      row("c", 0.8, 0.001, { errors: 2 }),
    ]);
    expect(decision.winner?.label).toBe("b");
    expect(decision.reasons).toContain("a: descartado (1 casos con puerta dura, 0 con error)");
  });

  it("prefiere el más barato si queda a menos de 0.03 del mejor", () => {
    expect(decide([row("caro", 0.94, 0.02), row("barato", 0.92, 0.003)]).winner?.label).toBe(
      "barato",
    );
    expect(decide([row("caro", 0.95, 0.02), row("barato", 0.91, 0.003)]).winner?.label).toBe(
      "caro",
    );
  });

  it("dice cuando ningún modelo es elegible y lo muestra en el reporte", () => {
    const decision = decide([row("a", 0.9, 0.01, { gates: 2 })]);
    expect(decision.winner).toBeUndefined();
    expect(renderComparison("Prueba", [row("a", 0.9, 0.01, { gates: 2 })], decision)).toContain(
      "**Sin modelo elegible.**",
    );
  });
});
