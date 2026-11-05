/**
 * ES: El corredor responde las aprobaciones como lo haría la persona en la interfaz:
 *     aprobar pide el token con el contenido exacto que el agente mostró, y cambiar o
 *     descartar devuelven los mismos resultados que los botones (ADR-08).
 * EN: The runner answers approvals as the person would in the UI: approving requests the
 *     token with the exact content the agent showed, and change or discard return the same
 *     results as the buttons (ADR-08).
 */
import {
  ApprovalOutput,
  changeRequestOutput,
  discardOutput,
  issueApproval,
  type ApprovalRequest,
} from "@alborada/web/agent";
import type { ApprovalStore } from "@alborada/mcp-server";
import type { UIMessage } from "ai";
import type { ApprovalReply } from "../cases/case-schema";

const ACTIONS = { request_draft_approval: "create", request_send_approval: "send" } as const;
type ApprovalToolName = keyof typeof ACTIONS;

export type PendingApproval = {
  toolName: ApprovalToolName;
  toolCallId: string;
  input: { campaign?: unknown; campaign_id?: string };
};

type ToolPartLike = { type: string; toolCallId?: string; state?: string; input?: unknown };

export function pendingApprovalOf(message: UIMessage | undefined): PendingApproval | undefined {
  for (const part of (message?.parts ?? []) as ToolPartLike[]) {
    const toolName = part.type.slice("tool-".length) as ApprovalToolName;
    if (!(toolName in ACTIONS) || part.state !== "input-available" || !part.toolCallId) continue;
    return {
      toolName,
      toolCallId: part.toolCallId,
      input: (part.input ?? {}) as PendingApproval["input"],
    };
  }
  return undefined;
}

export type Issuer = { secret: string; store: ApprovalStore; businessId: string; now?: () => Date };

export async function answerApproval(
  pending: PendingApproval,
  reply: ApprovalReply,
  issuer: Issuer,
): Promise<ApprovalOutput> {
  if (reply === "discard") return discardOutput();
  if (typeof reply === "object") return changeRequestOutput(reply.change);
  const request = {
    action: ACTIONS[pending.toolName],
    campaign: pending.input.campaign,
    campaign_id: pending.input.campaign_id,
  } as ApprovalRequest;
  const issued = await issueApproval(request, issuer);
  return ApprovalOutput.parse({ approved: true, ...issued });
}

export function withToolOutput(message: UIMessage, toolCallId: string, output: ApprovalOutput) {
  const parts = message.parts.map((part) =>
    (part as ToolPartLike).toolCallId === toolCallId
      ? { ...part, state: "output-available", output }
      : part,
  );
  return { ...message, parts } as UIMessage;
}
