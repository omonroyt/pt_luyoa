import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { SUGGESTIONS } from "./suggestions";
import { stepStatus, toolLabel, toolViewOf } from "./tool-parts";

type Part = UIMessage["parts"][number];

describe("toolViewOf", () => {
  it("lee igual una herramienta del MCP y una del agente", () => {
    const mcp = {
      type: "dynamic-tool",
      toolName: "compare_periods",
      toolCallId: "c1",
      state: "output-available",
      input: { current: "last_full_month" },
      output: { content: [] },
    } as Part;
    const block = {
      type: "tool-show_kpis",
      toolCallId: "c2",
      state: "input-available",
      input: { title: "t" },
    } as Part;
    expect(toolViewOf(mcp)).toMatchObject({ name: "compare_periods", callId: "c1" });
    expect(toolViewOf(block)).toMatchObject({ name: "show_kpis", state: "input-available" });
  });

  it("ignora las partes que no son de herramienta", () => {
    expect(toolViewOf({ type: "text", text: "hola" } as Part)).toBeNull();
    expect(toolViewOf({ type: "step-start" } as Part)).toBeNull();
  });
});

describe("stepStatus y toolLabel", () => {
  it("traduce el estado de la parte al estado del paso", () => {
    expect(stepStatus("input-available")).toBe("running");
    expect(stepStatus("output-available")).toBe("done");
    expect(stepStatus("output-error")).toBe("error");
  });

  it("da un nombre amable a cada consulta del MCP", () => {
    expect(toolLabel("audience_reach")).toBe("Calculando el alcance real");
    expect(toolLabel("otra_herramienta")).toBe("Consultando otra_herramienta");
  });

  it("da un nombre amable a las herramientas de memoria", () => {
    expect(toolLabel("remember_preference")).toBe("Guardando tu preferencia");
    expect(toolLabel("forget_preference")).toBe("Olvidando la preferencia");
  });
});

describe("SUGGESTIONS", () => {
  it("incluye el resumen de la semana, los seis escenarios y el caso de ejemplo", () => {
    expect(SUGGESTIONS.map((suggestion) => suggestion.id)).toEqual([
      "semana",
      "E-01",
      "E-02",
      "E-03",
      "E-04",
      "E-05",
      "E-06",
      "ejemplo",
    ]);
  });
});
