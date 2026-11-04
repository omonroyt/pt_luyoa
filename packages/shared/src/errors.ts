import { z } from "zod";

/**
 * ES: Códigos de error que el MCP devuelve al agente.
 * EN: Error codes the MCP returns to the agent.
 */
export const ToolErrorCode = z.enum([
  "unauthorized",
  "not_found",
  "conflict",
  "validation_error",
  "rate_limited",
  "busy",
  "approval_required",
  "approval_invalid",
  "upstream_error",
]);
export type ToolErrorCode = z.infer<typeof ToolErrorCode>;

export const ToolError = z.object({
  error: z.object({
    code: ToolErrorCode,
    message: z.string(),
    retryable: z.boolean(),
    suggestion: z.string().optional(),
  }),
});
export type ToolError = z.infer<typeof ToolError>;

/**
 * ES: Traduce el status HTTP de la API de Café Alborada a un código de herramienta.
 * EN: Maps the Café Alborada API HTTP status to a tool error code.
 */
export function errorCodeFromStatus(status: number, apiCode?: string): ToolErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422) return "validation_error";
  if (status === 429) return "rate_limited";
  if (status === 503 || apiCode === "busy") return "busy";
  return "upstream_error";
}
