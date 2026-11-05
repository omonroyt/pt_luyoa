"use client";

/**
 * ES: Contenedor del chat (IMP-40). Usa useChat contra /api/chat; el id de la conversación
 *     viaja en cada solicitud para guardar la traza. Cuando la persona resuelve una
 *     aprobación, la respuesta se envía sola (lastAssistantMessageIsCompleteWithToolCalls).
 * EN: Chat container (IMP-40). It uses useChat against /api/chat; the conversation id
 *     travels with every request to store the trace. When the person resolves an approval,
 *     the response is sent automatically (lastAssistantMessageIsCompleteWithToolCalls).
 */
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useMemo } from "react";
import { ApprovalProvider } from "@/components/blocks/approval-context";
import { SourcesProvider } from "@/components/blocks/sources-context";
import { hasPendingApproval } from "@/lib/ui/approvals";
import { collectSources } from "@/lib/ui/sources";
import { ChatInput } from "./chat-input";
import { MessageThread } from "./message-thread";
import { RetryBanner } from "./retry-banner";
import { SuggestionList } from "./suggestion-list";

const transport = new DefaultChatTransport({ api: "/api/chat" });

export function ChatShell() {
  const { messages, sendMessage, status, stop, error, regenerate, addToolOutput } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
  const sources = useMemo(() => collectSources(messages), [messages]);
  const busy = status === "submitted" || status === "streaming";
  const awaitingApproval = hasPendingApproval(messages);
  const approvals = useMemo(
    () => ({
      busy,
      resolve: (tool: string, toolCallId: string, output: unknown) =>
        void addToolOutput({ tool, toolCallId, output }),
    }),
    [busy, addToolOutput],
  );
  const send = (text: string) => void sendMessage({ text });
  return (
    <SourcesProvider value={sources}>
      <ApprovalProvider value={approvals}>
        <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-4 py-4">
          <header className="flex items-baseline justify-between gap-2 border-b border-border pb-3">
            <h1 className="text-lg font-semibold">☕ Café Alborada · Copiloto</h1>
          </header>
          <main className="flex flex-1 flex-col gap-4">
            {messages.length === 0 ? (
              <p className="text-muted">
                Pregúntame cómo va tu negocio: ventas, sucursales, clientes y campañas.
              </p>
            ) : (
              <MessageThread messages={messages} />
            )}
            {error ? <RetryBanner onRetry={() => void regenerate()} /> : null}
          </main>
          <footer className="sticky bottom-0 flex flex-col gap-3 bg-background pb-2 pt-2">
            <SuggestionList onPick={send} disabled={busy || awaitingApproval} />
            <ChatInput
              busy={busy}
              locked={awaitingApproval}
              onSend={send}
              onStop={() => void stop()}
            />
          </footer>
        </div>
      </ApprovalProvider>
    </SourcesProvider>
  );
}
