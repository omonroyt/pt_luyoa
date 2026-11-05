import { createMemoryApprovalStore } from "@alborada/mcp-server";
import { connectTestClient } from "@alborada/mcp-server/testing";
import { describe, expect, it } from "vitest";
import { GROUPS, MCP_TOOLS, type EvalCase } from "./case-schema";
import { loadCriteria, parseCriteria } from "./criteria";
import { figureAt } from "./figure-path";
import { loadCases, loadGolden, parseCase } from "./load-cases";

const cases = loadCases();
const criteria = loadCriteria();

// ES: Reparto del set según 08_PLAN_EVALUACION.md §3.
// EN: Set breakdown according to 08_PLAN_EVALUACION.md §3.
const PLANNED: Record<(typeof GROUPS)[number], number> = {
  scenario: 6,
  variant: 12,
  example: 1,
  negative: 5,
  fault: 4,
  approval: 4,
  multiturn: 2,
  memory: 2,
};

const idsOf = (evalCase: EvalCase) => [...evalCase.criteria, ...evalCase.expect.rubric];

describe("set de evaluación", () => {
  it("tiene los 36 casos del plan, repartidos por grupo", () => {
    expect(cases).toHaveLength(36);
    for (const group of GROUPS) {
      expect(
        cases.filter((evalCase) => evalCase.group === group),
        group,
      ).toHaveLength(PLANNED[group]);
    }
  });

  it("cada cifra esperada existe como número en su respuesta de referencia", () => {
    for (const evalCase of cases.filter((item) => item.expect.golden)) {
      const golden = loadGolden(evalCase.expect.golden ?? "");
      for (const path of evalCase.expect.figures) {
        expect(typeof figureAt(golden.figures, path), `${evalCase.id}: ${path}`).toBe("number");
      }
    }
  });

  it("cada criterio citado existe en 02_CRITERIOS_ACEPTACION.md", () => {
    for (const evalCase of cases) {
      for (const id of idsOf(evalCase))
        expect(criteria.has(id), `${evalCase.id}: ${id}`).toBe(true);
    }
  });

  it("los casos de escenarios no permiten escrituras sin aprobación", () => {
    const readOnly = cases.filter(
      (item) => item.expect.writes.create + item.expect.writes.send === 0,
    );
    for (const evalCase of readOnly.filter((item) => item.group !== "fault")) {
      expect(evalCase.expect.tools_forbidden, evalCase.id).toContain("send_campaign");
    }
  });

  it("la lista de herramientas coincide con las que registra el MCP", async () => {
    const session = await connectTestClient(
      {},
      { secret: "s".repeat(32), store: createMemoryApprovalStore() },
    );
    const { tools } = await session.client.listTools();
    await session.close();
    expect(tools.map((tool) => tool.name).sort()).toEqual([...MCP_TOOLS].sort());
  });
});

describe("formato de caso", () => {
  const base = `id: X-01
group: scenario
title: "Prueba"
criteria: ["CA-V01"]
turns:
  - user: "Hola"
`;

  it("exige una referencia cuando el caso pide cifras", () => {
    expect(() => parseCase(`${base}expect:\n  figures: [a.b]\n`, "x.yaml")).toThrow("golden");
  });

  it("exige una aprobación por cada escritura esperada", () => {
    expect(() => parseCase(`${base}expect:\n  writes: { create: 1, send: 0 }\n`, "x.yaml")).toThrow(
      "apruebe",
    );
  });

  it("rechaza herramientas que el MCP no tiene", () => {
    expect(() => parseCase(`${base}expect:\n  tools_required: [borrar_todo]\n`, "x.yaml")).toThrow(
      "tools_required",
    );
  });
});

describe("utilidades", () => {
  it("resuelve rutas con índices", () => {
    expect(figureAt({ a: [{ b: 1 }, { b: 2 }] }, "a[1].b")).toBe(2);
    expect(figureAt({ a: { b: 3 } }, "a.c")).toBeUndefined();
  });

  it("lee los criterios de una tabla de Markdown sin el formato en negritas", () => {
    const table = "| CA-E06-3 | **No** crea nada | EVAL |\n| Otro | x |";
    expect(parseCriteria(table)).toEqual(new Map([["CA-E06-3", "No crea nada"]]));
  });
});
