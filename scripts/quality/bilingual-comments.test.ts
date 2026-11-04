import { describe, expect, it } from "vitest";
import { findBilingualViolations } from "./bilingual-comments.ts";

describe("findBilingualViolations", () => {
  it("acepta un JSDoc con ES: y EN:", () => {
    const source = "/**\n * ES: Suma.\n * EN: Adds.\n */\nexport const add = 1;";
    expect(findBilingualViolations(source)).toEqual([]);
  });

  it("acepta líneas // consecutivas como un solo bloque", () => {
    const source = "// ES: Hola.\n// EN: Hello.\nconst greeting = 1;";
    expect(findBilingualViolations(source)).toEqual([]);
  });

  it("rechaza un comentario solo en español", () => {
    const source = "const total = 1;\n// Calcula el total\nconst other = 2;";
    expect(findBilingualViolations(source)).toEqual([{ line: 2, excerpt: "Calcula el total" }]);
  });

  it("ignora texto que parece comentario dentro de strings, templates y regex", () => {
    const source =
      'const url = "https://example.com";\nconst t = `a // b`;\nconst r = /"\\/\\//;\nconst q = "\'";';
    expect(findBilingualViolations(source)).toEqual([]);
  });

  it("exime directivas de herramientas y anotaciones de tipo JSDoc", () => {
    const source =
      "// eslint-disable-next-line no-console\n/** @type {string[]} */\nconst list = [];";
    expect(findBilingualViolations(source)).toEqual([]);
  });

  it("ignora el shebang", () => {
    expect(findBilingualViolations("#!/usr/bin/env node\nconst a = 1;")).toEqual([]);
  });
});
