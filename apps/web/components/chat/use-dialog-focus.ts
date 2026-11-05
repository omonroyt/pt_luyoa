"use client";

/**
 * ES: Foco de un panel que se abre sobre el chat: al abrir, el foco pasa al panel; Escape
 *     lo cierra; al cerrar, el foco vuelve al botón que lo abrió (WCAG 2.4.3).
 * EN: Focus for a panel opened over the chat: on open, focus moves to the panel; Escape
 *     closes it; on close, focus returns to the button that opened it (WCAG 2.4.3).
 */
import { useEffect, useRef } from "react";

export function useDialogFocus<Element extends HTMLElement>(onClose: () => void) {
  const panel = useRef<Element>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, []);
  return panel;
}
