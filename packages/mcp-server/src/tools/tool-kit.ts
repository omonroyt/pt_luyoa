import type { ToolOutput } from "@alborada/shared";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { PERIOD_PRESETS } from "../domain/periods";
import { asToolFailure } from "../errors";

/**
 * ES: Ejecuta una herramienta y adapta su resultado al formato MCP. Cualquier error
 *     se devuelve como ToolError con isError, nunca como excepción sin formato.
 * EN: Runs a tool and adapts its result to the MCP format. Any error is returned as
 *     a ToolError with isError, never as an unformatted exception.
 */
export async function runTool<T>(work: () => Promise<ToolOutput<T>>): Promise<CallToolResult> {
  try {
    const output = await work();
    return { content: [{ type: "text", text: JSON.stringify(output) }] };
  } catch (error) {
    const toolError = asToolFailure(error).toToolError();
    return { isError: true, content: [{ type: "text", text: JSON.stringify(toolError) }] };
  }
}

export const periodSchema = z
  .union([
    z.enum(PERIOD_PRESETS),
    z.object({
      from: z.string().describe("Fecha inicial local AAAA-MM-DD"),
      to: z.string().describe("Fecha final local AAAA-MM-DD"),
    }),
  ])
  .describe(
    "Preset relativo a data_as_of (last_full_month, previous_full_month, last_week, previous_week, " +
      "last_12_weeks, previous_12_weeks, last_3_months, previous_3_months, all_data) o rango {from, to}",
  );

export const locationIdSchema = z
  .string()
  .describe("Id de sucursal tal como lo devuelve get_business_context (p. ej. loc_roma)");
