/**
 * ES: Mensajes de error que recibe la interfaz. Un argumento inválido o un bloque que no
 *     pasa el verificador de cifras son correcciones que el modelo hace en el paso
 *     siguiente (recibe el detalle), no fallas del servicio. Los detalles internos nunca
 *     llegan al navegador.
 * EN: Error messages the UI receives. An invalid argument or a block that fails the figure
 *     verifier are corrections the model makes in the next step (it receives the details),
 *     not service failures. Internal details never reach the browser.
 */
import { InvalidToolInputError } from "ai";
import { FigureVerificationError } from "./figure-verifier";

export const STREAM_ERROR_MESSAGE =
  "No pude completar la respuesta por un error del servicio. ¿Lo intento de nuevo?";
export const INVALID_BLOCK_MESSAGE =
  "El agente armó un bloque con datos inválidos y lo está corrigiendo.";
export const UNVERIFIED_BLOCK_MESSAGE =
  "El agente está corrigiendo un bloque cuyas cifras no coincidían con sus fuentes.";

// ES: El AI SDK reporta un mismo error dos veces: como objeto (tool-input-error o
//     tool-output-error) y como texto "Nombre: mensaje". Las pruebas de run-turn detectan
//     si una versión futura cambia ese formato.
// EN: The AI SDK reports the same error twice: as an object (tool-input-error or
//     tool-output-error) and as "Name: message" text. The run-turn tests detect if a
//     future version changes that format.
const isNamed = (error: unknown, name: string) =>
  typeof error === "string" && error.startsWith(name);

export function uiErrorMessage(error: unknown): string {
  if (InvalidToolInputError.isInstance(error) || isNamed(error, "AI_InvalidToolInputError")) {
    return INVALID_BLOCK_MESSAGE;
  }
  if (error instanceof FigureVerificationError || isNamed(error, "FigureVerificationError")) {
    return UNVERIFIED_BLOCK_MESSAGE;
  }
  return STREAM_ERROR_MESSAGE;
}
