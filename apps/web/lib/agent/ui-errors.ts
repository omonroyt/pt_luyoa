/**
 * ES: Mensajes de error que recibe la interfaz. Un argumento inválido o un bloque que no
 *     pasa el verificador de cifras son correcciones que el modelo hace en el paso
 *     siguiente (recibe el detalle), no fallas del servicio. Los detalles internos nunca
 *     llegan al navegador.
 * EN: Error messages the UI receives. An invalid argument or a block that fails the figure
 *     verifier are corrections the model makes in the next step (it receives the details),
 *     not service failures. Internal details never reach the browser.
 */
import { InvalidToolInputError, NoSuchToolError } from "ai";
import { FigureVerificationError } from "./figure-verifier";

export const STREAM_ERROR_MESSAGE =
  "No pude completar la respuesta por un error del servicio. ¿Lo intento de nuevo?";
export const INVALID_BLOCK_MESSAGE =
  "El agente armó un bloque con datos inválidos y lo está corrigiendo.";
export const UNVERIFIED_BLOCK_MESSAGE =
  "El agente está corrigiendo un bloque cuyas cifras no coincidían con sus fuentes.";
// ES: El modelo pidió la aprobación antes de que una tarjeta pasara el verificador
//     (card-gate.ts), o llamó una herramienta que el paso no ofrece (ADR-08).
// EN: The model asked for approval before a card passed the verifier (card-gate.ts), or
//     called a tool the step does not offer (ADR-08).
export const INVALID_PREFERENCE_MESSAGE =
  "El agente está corrigiendo una preferencia con un valor no válido.";
export const EARLY_STEP_MESSAGE = "El agente pidió un paso antes de tiempo y lo está corrigiendo.";

// ES: El AI SDK reporta un mismo error dos veces: como objeto (tool-input-error o
//     tool-output-error) y como texto "Nombre: mensaje". Las pruebas de run-turn detectan
//     si una versión futura cambia ese formato.
// EN: The AI SDK reports the same error twice: as an object (tool-input-error or
//     tool-output-error) and as "Name: message" text. The run-turn tests detect if a
//     future version changes that format.
const isNamed = (error: unknown, name: string) =>
  typeof error === "string" && error.startsWith(name);

const PREFERENCE_INPUT = /^AI_InvalidToolInputError: Invalid input for tool remember_preference/;

function isInvalidPreference(error: unknown): boolean {
  if (InvalidToolInputError.isInstance(error)) return error.toolName === "remember_preference";
  return typeof error === "string" && PREFERENCE_INPUT.test(error);
}

const APPROVAL_INPUT =
  /^AI_InvalidToolInputError: Invalid input for tool request_(draft|send)_approval/;

function isEarlyApproval(error: unknown): boolean {
  if (InvalidToolInputError.isInstance(error)) return error.toolName.endsWith("_approval");
  if (NoSuchToolError.isInstance(error)) return true;
  return (
    isNamed(error, "AI_NoSuchToolError") ||
    (typeof error === "string" && APPROVAL_INPUT.test(error))
  );
}

export function uiErrorMessage(error: unknown): string {
  if (isEarlyApproval(error)) return EARLY_STEP_MESSAGE;
  if (isInvalidPreference(error)) return INVALID_PREFERENCE_MESSAGE;
  if (InvalidToolInputError.isInstance(error) || isNamed(error, "AI_InvalidToolInputError")) {
    return INVALID_BLOCK_MESSAGE;
  }
  if (error instanceof FigureVerificationError || isNamed(error, "FigureVerificationError")) {
    return UNVERIFIED_BLOCK_MESSAGE;
  }
  return STREAM_ERROR_MESSAGE;
}

const LOGGED_LENGTH = 300;

function describeError(error: unknown): string {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return text.slice(0, LOGGED_LENGTH);
}

/**
 * ES: Traduce el error para la interfaz y, si no es una corrección esperada del modelo,
 *     lo registra en el servidor con su nombre y mensaje (sin datos del turno), para poder
 *     diagnosticar fallas del proveedor o del stream.
 * EN: Translates the error for the UI and, if it is not an expected model correction,
 *     logs it on the server with its name and message (no turn data), so provider or
 *     stream failures can be diagnosed.
 */
export function reportStreamError(
  error: unknown,
  log: (message: string) => void = (message) => console.error(message),
): string {
  const message = uiErrorMessage(error);
  if (message === STREAM_ERROR_MESSAGE) log(`Error del stream del agente: ${describeError(error)}`);
  return message;
}
