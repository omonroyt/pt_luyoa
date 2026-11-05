"use client";

/**
 * ES: Hilo de mensajes; la página acompaña la respuesta mientras llega (useStickToBottom).
 * EN: Message thread; the page follows the answer while it arrives (useStickToBottom).
 */
import type { UIMessage } from "ai";
import { useRef } from "react";
import { MessageItem } from "./message-item";
import { useStickToBottom } from "./use-stick-to-bottom";

type MessageThreadProps = { messages: UIMessage[]; onShowTrace: (messageId: string) => void };

export function MessageThread({ messages, onShowTrace }: MessageThreadProps) {
  const thread = useRef<HTMLDivElement>(null);
  useStickToBottom(thread, messages.filter((message) => message.role === "user").length);
  return (
    <div
      ref={thread}
      className="flex flex-col gap-8"
      role="log"
      aria-live="polite"
      aria-label="Conversación"
    >
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} onShowTrace={onShowTrace} />
      ))}
    </div>
  );
}
