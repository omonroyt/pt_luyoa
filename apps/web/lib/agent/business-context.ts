/**
 * ES: Contexto fijo de la conversación (06_DISENO_AGENTE §2). Se obtiene llamando
 *     get_business_context por el mismo cliente MCP del agente, de modo que el prompt usa
 *     la fecha de corte y el calendario que calcula el código, nunca la fecha del sistema
 *     (T-01). Conserva el source.id para que el modelo pueda citarlo.
 * EN: Fixed conversation context (06_DISENO_AGENTE §2). It is obtained by calling
 *     get_business_context through the agent's own MCP client, so the prompt uses the
 *     cutoff date and calendar computed by code, never the system date (T-01). It keeps the
 *     source.id so the model can cite it.
 */
import type { ToolSet } from "ai";
import { z } from "zod";

const PresetPeriod = z.object({
  from: z.string(),
  to: z.string(),
  days: z.number(),
  label: z.string(),
});

const BusinessContextOutput = z.object({
  data: z.object({
    business: z.object({ name: z.string(), points_rule: z.string(), reward_rule: z.string() }),
    locations: z.array(z.object({ id: z.string(), name: z.string() })),
    segments: z.array(z.object({ id: z.string(), definition: z.string(), customers: z.number() })),
    calendar: z.object({
      dataFrom: z.string(),
      dataAsOf: z.string(),
      presets: z.record(z.string(), PresetPeriod),
      firstOfferDate: z.string(),
    }),
  }),
  source: z.object({ id: z.string() }),
});

export type BusinessContext = z.infer<typeof BusinessContextOutput>["data"] & {
  sourceId: string;
};

const CallToolText = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  isError: z.boolean().optional(),
});

/**
 * ES: Traduce el resultado MCP (texto JSON) al contexto validado; falla con un mensaje
 *     claro si la herramienta devolvió un error o un formato inesperado.
 * EN: Turns the MCP result (JSON text) into the validated context; fails with a clear
 *     message if the tool returned an error or an unexpected shape.
 */
export function parseBusinessContext(result: unknown): BusinessContext {
  const call = CallToolText.parse(result);
  const text = call.content.find((part) => part.type === "text")?.text ?? "";
  if (call.isError) throw new Error(`get_business_context falló: ${text.slice(0, 200)}`);
  const parsed = BusinessContextOutput.parse(JSON.parse(text));
  return { ...parsed.data, sourceId: parsed.source.id };
}

export async function loadBusinessContext(tools: ToolSet): Promise<BusinessContext> {
  const execute = tools.get_business_context?.execute;
  if (!execute) throw new Error("El MCP no expone get_business_context.");
  const result = await execute({}, { toolCallId: "business-context", messages: [], context: {} });
  return parseBusinessContext(result);
}
