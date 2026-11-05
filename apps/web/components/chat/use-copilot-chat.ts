"use client";

/**
 * ES: Estado del chat del copiloto: useChat contra /api/chat más lo que derivan los
 *     componentes (fuentes, aprobación pendiente y el puente de aprobaciones). Cuando la
 *     persona resuelve una aprobación, la respuesta se envía sola
 *     (lastAssistantMessageIsCompleteWithToolCalls).
 * EN: Copilot chat state: useChat against /api/chat plus what the components derive
 *     (sources, pending approval and the approval bridge). When the person resolves an
 *     approval, the response is sent automatically
 *     (lastAssistantMessageIsCompleteWithToolCalls).
 */
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useMemo } from "react";
import type { ApprovalBridge } from "@/components/blocks/approval-context";
import { hasPendingApproval } from "@/lib/ui/approvals";
import { collectSources } from "@/lib/ui/sources";

const transport = new DefaultChatTransport({ api: "/api/chat" });

export function useCopilotChat() {
  const chat = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
  const { messages, status, addToolOutput } = chat;
  const busy = status === "submitted" || status === "streaming";
  const sources = useMemo(() => collectSources(messages), [messages]);
  const approvals = useMemo<ApprovalBridge>(
    () => ({
      busy,
      resolve: (tool, toolCallId, output) => void addToolOutput({ tool, toolCallId, output }),
    }),
    [busy, addToolOutput],
  );
  return {
    ...chat,
    busy,
    sources,
    approvals,
    awaitingApproval: hasPendingApproval(messages),
    send: (text: string) => void chat.sendMessage({ text }),
  };
}
