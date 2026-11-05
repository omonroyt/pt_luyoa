/**
 * ES: Control del orquestador sobre la aprobación (ADR-08, CA-C04). Si en el turno se
 *     mostró una tarjeta de campaña y el modelo no pidió la aprobación con su herramienta,
 *     el siguiente paso queda obligado a llamarla: request_draft_approval para una
 *     propuesta y request_send_approval para un borrador. Así toda tarjeta llega a la
 *     interfaz con sus botones (07 §3.4) y la aprobación nunca se pide solo en texto, un
 *     error que la regla del prompt no evitó en la corrida de humo con GLM.
 * EN: Orchestrator control over approval (ADR-08, CA-C04). If a campaign card was shown in
 *     the turn and the model did not ask for approval with its tool, the next step is
 *     forced to call it: request_draft_approval for a proposal and request_send_approval
 *     for a draft. Every card thus reaches the UI with its buttons (07 §3.4) and approval
 *     is never asked only in text, an error the prompt rule did not prevent in the GLM
 *     smoke run.
 */
import { APPROVAL_TOOLS } from "./approval-tools";

type ApprovalTool = (typeof APPROVAL_TOOLS)[number];

const TOOL_BY_STATE: Record<string, ApprovalTool> = {
  proposal: "request_draft_approval",
  awaiting_draft_approval: "request_draft_approval",
  draft: "request_send_approval",
  awaiting_send_approval: "request_send_approval",
};

const approvalTools = new Set<string>(APPROVAL_TOOLS);

type StepPart = { type: string; toolName?: string; input?: unknown };
export type StepLike = { content: ReadonlyArray<StepPart> };

function cardState(part: StepPart): string | undefined {
  if (part.type !== "tool-result" || part.toolName !== "show_campaign_card") return undefined;
  return (part.input as { state?: unknown } | undefined)?.state as string | undefined;
}

/**
 * ES: Herramienta de aprobación que falta, según la última tarjeta mostrada con éxito
 *     (tool-result) y si después hubo una llamada de aprobación.
 * EN: Missing approval tool, according to the last successfully shown card (tool-result)
 *     and whether an approval call followed it.
 */
export function missingApproval(steps: ReadonlyArray<StepLike>): ApprovalTool | undefined {
  let missing: ApprovalTool | undefined;
  for (const step of steps) {
    const asked = step.content.some(
      (part) => part.type === "tool-call" && approvalTools.has(part.toolName ?? ""),
    );
    const shown = step.content
      .map(cardState)
      .filter((state) => state !== undefined)
      .at(-1);
    if (asked) missing = undefined;
    else if (shown) missing = TOOL_BY_STATE[shown];
  }
  return missing;
}

export function approvalStepPolicy() {
  return ({ steps }: { steps: ReadonlyArray<StepLike> }) => {
    const toolName = missingApproval(steps);
    return toolName
      ? { activeTools: [toolName], toolChoice: { type: "tool" as const, toolName } }
      : undefined;
  };
}
