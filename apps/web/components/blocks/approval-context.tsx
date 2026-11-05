"use client";

/**
 * ES: Puente entre el panel de aprobación y useChat: entrega el resultado de la llamada
 *     de aprobación (addToolOutput) e indica si el chat está ocupado.
 * EN: Bridge between the approval panel and useChat: it delivers the approval call result
 *     (addToolOutput) and tells whether the chat is busy.
 */
import type { ApprovalOutput } from "@/lib/agent/approval-tools";
import { createContext, useContext } from "react";

export type ApprovalBridge = {
  resolve: (tool: string, toolCallId: string, output: ApprovalOutput) => void;
  busy: boolean;
};

const ApprovalContext = createContext<ApprovalBridge>({ resolve: () => undefined, busy: true });

export const ApprovalProvider = ApprovalContext.Provider;

export function useApprovalBridge(): ApprovalBridge {
  return useContext(ApprovalContext);
}
