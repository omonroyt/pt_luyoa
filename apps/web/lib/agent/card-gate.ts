/**
 * ES: Compuerta de la aprobación (ADR-08, CA-C03). Recuerda el estado de la última tarjeta
 *     de campaña que pasó el verificador en el turno, y las herramientas de aprobación la
 *     consultan al validar su entrada. Sin una tarjeta válida del estado que corresponde,
 *     la llamada falla con una instrucción para el modelo, que corrige en el paso siguiente.
 *     La tarjeta se verifica al validar su entrada, y el AI SDK valida las llamadas de un
 *     paso en orden: si la tarjeta y la aprobación llegan juntas, la aprobación ya conoce
 *     el veredicto. En M6 se ocultaban las herramientas de aprobación hasta tener tarjeta,
 *     pero el SDK respondía "herramienta no disponible" y Claude Haiku 5.5 dejaba de
 *     intentarlo.
 * EN: Approval gate (ADR-08, CA-C03). It remembers the state of the last campaign card
 *     that passed the verifier in the turn, and the approval tools check it when
 *     validating their input. Without a valid card of the matching state, the call fails
 *     with an instruction for the model, which corrects it on the next step. The card is
 *     verified when its input is validated, and the AI SDK validates a step's calls in
 *     order: if the card and the approval arrive together, the approval already knows the
 *     verdict. In M6 the approval tools were hidden until there was a card, but the SDK
 *     answered "tool not available" and Claude Haiku 5.5 stopped trying.
 */

export type ApprovalToolName = "request_draft_approval" | "request_send_approval";

export const APPROVAL_BY_CARD_STATE: Record<string, ApprovalToolName> = {
  proposal: "request_draft_approval",
  awaiting_draft_approval: "request_draft_approval",
  draft: "request_send_approval",
  awaiting_send_approval: "request_send_approval",
};

export type CardGate = {
  record: (state: string) => void;
  allows: (toolName: ApprovalToolName) => boolean;
};

export function createCardGate(): CardGate {
  let lastState: string | undefined;
  return {
    record(state) {
      lastState = state;
    },
    allows(toolName) {
      return lastState !== undefined && APPROVAL_BY_CARD_STATE[lastState] === toolName;
    },
  };
}

const CARD_STATE_FOR: Record<ApprovalToolName, string> = {
  request_draft_approval: "proposal",
  request_send_approval: "draft",
};

export function cardFirstMessage(toolName: ApprovalToolName): string {
  return [
    `Antes de ${toolName} debe mostrarse una tarjeta en estado ${CARD_STATE_FOR[toolName]} que`,
    "pase la verificación de cifras. Muéstrala con show_campaign_card (o corrígela con el",
    `detalle que recibiste) y vuelve a llamar ${toolName}. La herramienta sí está disponible.`,
  ].join(" ");
}
