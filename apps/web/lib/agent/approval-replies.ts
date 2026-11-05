/**
 * ES: Resultados de rechazo de una aprobación (ADR-08): "Descartar" y "Cambiar". Los usan
 *     la interfaz y el corredor de evaluaciones, así que el agente recibe exactamente lo
 *     mismo en ambos casos. No depende de código de servidor y se puede usar en el navegador.
 * EN: Rejection results of an approval (ADR-08): "Descartar" and "Cambiar". Both the UI
 *     and the evaluation runner use them, so the agent receives exactly the same in both
 *     cases. It has no server dependencies and can be used in the browser.
 */
import type { ApprovalOutput } from "./approval-tools";

export const DISCARD_REASON = "La persona descartó la campaña.";

export function changeRequestOutput(changes: string): ApprovalOutput {
  return { approved: false, reason: `La persona pidió cambios: ${changes.trim()}` };
}

export function discardOutput(): ApprovalOutput {
  return { approved: false, reason: DISCARD_REASON };
}
