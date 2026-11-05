"use client";

/**
 * ES: Contenedor del chat (IMP-40, IMP-43, IMP-61): hilo, entrada, sugerencias, panel de
 *     trazas y panel de preferencias guardadas; solo hay un panel abierto a la vez.
 *     El id de la conversación es el de useChat, que viaja en cada solicitud y con el que
 *     se guarda y se lee la traza.
 * EN: Chat container (IMP-40, IMP-43, IMP-61): thread, input, suggestions, trace panel and
 *     stored preferences panel; only one panel is open at a time. The
 *     conversation id is the useChat one, which travels with every request and is used to
 *     store and read the trace.
 */
import { useState } from "react";
import { ApprovalProvider } from "@/components/blocks/approval-context";
import { SourcesProvider } from "@/components/blocks/sources-context";
import { ChatHeader } from "./chat-header";
import { ChatInput } from "./chat-input";
import { EmptyChat } from "./empty-chat";
import { MessageThread } from "./message-thread";
import { PreferencesPanel } from "./preferences-panel";
import { RetryBanner } from "./retry-banner";
import { SuggestionList } from "./suggestion-list";
import { TracePanel } from "./trace-panel";
import { useCopilotChat } from "./use-copilot-chat";

export function ChatShell() {
  const chat = useCopilotChat();
  const [traceFor, setTraceFor] = useState<string | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const showTrace = (messageId: string | null) => {
    setPreferencesOpen(false);
    setTraceFor(messageId);
  };
  const showPreferences = () => {
    setTraceFor(null);
    setPreferencesOpen(true);
  };
  const lastAssistant = chat.messages.findLast((message) => message.role === "assistant");
  return (
    <SourcesProvider value={chat.sources}>
      <ApprovalProvider value={chat.approvals}>
        <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-4 py-4">
          <ChatHeader
            traceAvailable={Boolean(lastAssistant)}
            onShowPreferences={showPreferences}
            onShowTrace={() => showTrace(lastAssistant?.id ?? null)}
          />
          <main className="flex flex-1 flex-col gap-4">
            {chat.messages.length === 0 ? (
              <EmptyChat onOpenSummary={chat.setMessages} />
            ) : (
              <MessageThread messages={chat.messages} onShowTrace={showTrace} />
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
        {preferencesOpen ? (
          <PreferencesPanel busy={chat.busy} onClose={() => setPreferencesOpen(false)} />
        ) : null}
      </ApprovalProvider>
    </SourcesProvider>
  );
}
