/**
 * ES: Agrega a cada herramienta un campo opcional "reason" (ADR-11): una frase del modelo
 *     con el porqué de la llamada, que se guarda en la traza. Se agrega del lado del agente,
 *     sin cambiar los contratos del MCP ni de los bloques: el esquema original sigue
 *     validando el resto de la entrada y "reason" se quita antes de ejecutar.
 * EN: Adds an optional "reason" field to every tool (ADR-11): a sentence from the model
 *     explaining why it calls the tool, stored in the trace. It is added on the agent side,
 *     without changing the MCP or block contracts: the original schema still validates the
 *     rest of the input and "reason" is removed before executing.
 */
import { asSchema, jsonSchema, type Tool, type ToolSet } from "ai";

export const REASON_FIELD = "reason";
const REASON_SCHEMA = {
  type: "string",
  description: "Una frase breve: por qué llamas esta herramienta",
} as const;

type WithReason = Record<string, unknown> & { reason?: unknown };

export function splitReason(input: unknown): { reason: string | undefined; rest: unknown } {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { reason: undefined, rest: input };
  }
  const { reason, ...rest } = input as WithReason;
  return { reason: typeof reason === "string" ? reason : undefined, rest };
}

async function schemaWithReason(original: Tool["inputSchema"]) {
  const base = asSchema(original);
  const json = await base.jsonSchema;
  const properties = { ...(json.properties ?? {}), [REASON_FIELD]: REASON_SCHEMA };
  return jsonSchema<unknown>(
    { ...json, properties },
    {
      validate: async (value) => {
        const { reason, rest } = splitReason(value);
        const result = base.validate
          ? await base.validate(rest)
          : { success: true as const, value: rest };
        if (!result.success) return result;
        const validated = result.value as Record<string, unknown>;
        return { success: true as const, value: reason ? { ...validated, reason } : validated };
      },
    },
  );
}

async function wrapTool(original: Tool): Promise<Tool> {
  const execute = original.execute;
  const inputSchema = await schemaWithReason(original.inputSchema);
  if (!execute) return { ...original, inputSchema } as Tool;
  const withoutReason: typeof execute = (input, options) =>
    execute(splitReason(input).rest as never, options);
  return { ...original, inputSchema, execute: withoutReason } as Tool;
}

export async function withReason(tools: ToolSet): Promise<ToolSet> {
  const entries = await Promise.all(
    Object.entries(tools).map(async ([name, tool]) => [name, await wrapTool(tool)] as const),
  );
  return Object.fromEntries(entries);
}
