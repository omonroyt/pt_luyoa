"use client";

/**
 * ES: Hilo de mensajes; se desplaza al final cuando llega contenido nuevo.
 * EN: Message thread; it scrolls to the end when new content arrives.
 */
import type { UIMessage } from "ai";
import { useEffect, useRef } from "react";
import { MessageItem } from "./message-item";

export function MessageThread({ messages }: { messages: UIMessage[] }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);
  return (
    <div className="flex flex-col gap-6" role="log" aria-live="polite" aria-label="Conversación">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      <div ref={end} />
    </div>
  );
}
