import type { ToolError, ToolErrorCode } from "@alborada/shared";

export type ToolFailureDetails = {
  code: ToolErrorCode;
  message: string;
  retryable?: boolean;
  suggestion?: string;
};

/**
 * ES: Único tipo de error del MCP. Todo fallo (validación, API, red) se expresa así
 *     para que el agente reciba siempre código, mensaje, si conviene reintentar y una sugerencia.
 * EN: The single MCP error type. Every failure (validation, API, network) is expressed
 *     this way so the agent always gets a code, message, retry hint and suggestion.
 */
export class ToolFailure extends Error {
  readonly code: ToolErrorCode;
  readonly retryable: boolean;
  readonly suggestion: string | undefined;

  constructor(details: ToolFailureDetails) {
    super(details.message);
    this.name = "ToolFailure";
    this.code = details.code;
    this.retryable = details.retryable ?? false;
    this.suggestion = details.suggestion;
  }

  toToolError(): ToolError {
    const suggestion = this.suggestion ? { suggestion: this.suggestion } : {};
    return {
      error: { code: this.code, message: this.message, retryable: this.retryable, ...suggestion },
    };
  }
}

/**
 * ES: Convierte cualquier error en ToolFailure; lo desconocido se reporta como
 *     upstream_error sin exponer detalles internos.
 * EN: Converts any error into a ToolFailure; unknown errors are reported as
 *     upstream_error without exposing internal details.
 */
export function asToolFailure(error: unknown): ToolFailure {
  if (error instanceof ToolFailure) return error;
  return new ToolFailure({
    code: "upstream_error",
    message: "Error inesperado al consultar los datos.",
    retryable: true,
    suggestion: "Reintentar la consulta; si persiste, responder con la información ya obtenida.",
  });
}
