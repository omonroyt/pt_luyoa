import { asSchema, tool } from "ai";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { splitReason, withReason } from "./with-reason";

const received: unknown[] = [];
const probe = tool({
  inputSchema: z.object({ period: z.enum(["last_full_month", "last_12_weeks"]) }),
  execute: async (input) => {
    received.push(input);
    return { ok: true };
  },
});

describe("withReason", () => {
  it("agrega reason al esquema que ve el modelo", async () => {
    const { probe: wrapped } = await withReason({ probe });
    const json = await asSchema(wrapped!.inputSchema).jsonSchema;
    expect(Object.keys(json.properties ?? {})).toEqual(["period", "reason"]);
  });

  it("valida con el esquema original y conserva reason para la traza", async () => {
    const { probe: wrapped } = await withReason({ probe });
    const schema = asSchema(wrapped!.inputSchema);
    const valid = await schema.validate!({ period: "last_12_weeks", reason: "comparar días" });
    const invalid = await schema.validate!({ period: "ayer", reason: "x" });
    expect(valid).toEqual({
      success: true,
      value: { period: "last_12_weeks", reason: "comparar días" },
    });
    expect(invalid.success).toBe(false);
  });

  it("quita reason antes de ejecutar la herramienta", async () => {
    received.length = 0;
    const { probe: wrapped } = await withReason({ probe });
    await wrapped!.execute!(
      { period: "last_full_month", reason: "ver el mes" },
      { toolCallId: "c1", messages: [], context: {} },
    );
    expect(received).toEqual([{ period: "last_full_month" }]);
  });

  it("separa reason del resto de la entrada", () => {
    expect(splitReason({ a: 1, reason: "por qué" })).toEqual({ reason: "por qué", rest: { a: 1 } });
    expect(splitReason({ a: 1 })).toEqual({ reason: undefined, rest: { a: 1 } });
  });
});
