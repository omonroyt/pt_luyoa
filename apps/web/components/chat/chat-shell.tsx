"use client";

/**
 * ES: Contenedor del chat (IMP-40, IMP-43): hilo, entrada, sugerencias y panel de trazas.
 *     El id de la conversación es el de useChat, que viaja en cada solicitud y con el que
 *     se guarda y se lee la traza.
 * EN: Chat container (IMP-40, IMP-43): thread, input, suggestions and trace panel. The
 *     conversation id is the useChat one, which travels with every request and is used to
 *     store and read the trace.
 */
import { useState } from "react";
import { ApprovalProvider } from "@/components/blocks/approval-context";
import { SourcesProvider } from "@/components/blocks/sources-context";
import { ChatInput } from "./chat-input";
import { MessageThread } from "./message-thread";
import { RetryBanner } from "./retry-banner";
import { SuggestionList } from "./suggestion-list";
import { TracePanel } from "./trace-panel";
import { useCopilotChat } from "./use-copilot-chat";

export function ChatShell() {
  const chat = useCopilotChat();
  const [traceFor, setTraceFor] = useState<string | null>(null);
  const lastAssistant = chat.messages.findLast((message) => message.role === "assistant");
  return (
    <SourcesProvider value={chat.sources}>
      <ApprovalProvider value={chat.approvals}>
        <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-4 py-4">
          <header className="flex items-center justify-between gap-2 border-b border-border pb-3">
            <h1 className="text-lg font-semibold">☕ Café Alborada · Copiloto</h1>
            <button
              type="button"
              disabled={!lastAssistant}
              onClick={() => setTraceFor(lastAssistant?.id ?? null)}
              className="rounded-lg border border-border px-3 py-1 text-sm disabled:opacity-50"
            >
              Trazas
            </button>
          </header>
          <main className="flex flex-1 flex-col gap-4">
            {chat.messages.length === 0 ? (
              <p className="text-muted">
                Pregúntame cómo va tu negocio: ventas, sucursales, clientes y campañas.
              </p>
            ) : (
              <MessageThread messages={chat.messages} onShowTrace={setTraceFor} />
            )}
            {chat.error ? <RetryBanner onRetry={() => void chat.regenerate()} /> : null}
          </main>
          <footer className="sticky bottom-0 flex flex-col gap-3 bg-background pb-2 pt-2">
            <SuggestionList onPick={chat.send} disabled={chat.busy || chat.awaitingApproval} />
            <ChatInput
              busy={chat.busy}
              locked={chat.awaitingApproval}
              onSend={chat.send}
              onStop={() => void chat.stop()}
            />
          </footer>
        </div>
        {traceFor ? (
          <TracePanel
            key={traceFor}
            conversationId={chat.id}
            messageId={traceFor}
            busy={chat.busy}
            onClose={() => setTraceFor(null)}
          />
        ) : null}
      </ApprovalProvider>
    </SourcesProvider>
  );
}
