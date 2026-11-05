import type { ChartBlock } from "@alborada/shared";
import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { sortedData, tableColumns } from "./chart-data";
import { citedSourcesOf } from "./cited-sources";
import { sourceOf, toolFailureOf } from "./tool-result";

const textResult = (value: unknown, isError = false) => ({
  isError,
  content: [{ type: "text", text: JSON.stringify(value) }],
});

const chart: ChartBlock = {
  kind: "bar",
  title: "Transacciones por día",
  period: { from: "2026-08-08", to: "2026-10-31" },
  sources: ["src_0123456789"],
  x: { key: "day", label: "Día" },
  series: [{ key: "per_day", label: "Por día", unit: "per_day" }],
  data: [
    { day: "lun", per_day: 81 },
    { day: "dom", per_day: 52 },
    { day: "sáb", per_day: 95 },
  ],
};

describe("resultado de herramienta", () => {
  it("lee el mensaje de un error del MCP", () => {
    const error = { error: { code: "busy", message: "La API está ocupada.", retryable: true } };
    expect(toolFailureOf(textResult(error, true))).toBe("La API está ocupada.");
  });

  it("usa un mensaje genérico si el error no tiene la forma esperada", () => {
    expect(toolFailureOf(textResult({ detalle: "x" }, true))).toBe("La consulta falló.");
  });

  it("no reporta error en un resultado correcto ni lee fuentes inválidas", () => {
    expect(toolFailureOf(textResult({ data: 1 }))).toBeUndefined();
    expect(sourceOf(textResult({ source: { id: "x" } }))).toBeUndefined();
    expect(sourceOf({ content: [{ type: "text", text: "no es json" }] })).toBeUndefined();
  });
});

describe("datos de la gráfica", () => {
  it("respeta el orden pedido por el bloque sin modificar los datos originales", () => {
    expect(sortedData({ ...chart, sort: "asc" }).map((row) => row.day)).toEqual([
      "dom",
      "lun",
      "sáb",
    ]);
    expect(sortedData({ ...chart, sort: "desc" }).map((row) => row.day)).toEqual([
      "sáb",
      "lun",
      "dom",
    ]);
    expect(sortedData(chart)).toBe(chart.data);
  });

  it("arma las columnas de la tabla equivalente con el eje x y cada serie", () => {
    expect(tableColumns(chart)).toEqual([
      { key: "day", label: "Día" },
      { key: "per_day", label: "Por día", unit: "per_day" },
    ]);
  });
});

describe("fuentes citadas", () => {
  it("junta las fuentes de cite_sources terminadas e ignora las que siguen en curso", () => {
    const cite = (state: string, sources: string[]) => ({
      type: "tool-cite_sources",
      toolCallId: `c-${state}`,
      state,
      input: { sources },
      output: { shown: true },
    });
    const message = {
      id: "m1",
      role: "assistant",
      parts: [cite("output-available", ["src_0123456789"]), cite("input-streaming", ["src_x"])],
    } as unknown as UIMessage;
    expect(citedSourcesOf(message)).toEqual(["src_0123456789"]);
  });
});
