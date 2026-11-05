/**
 * ES: Hace que la página acompañe la respuesta mientras crece: cada vez que el hilo cambia
 *     de alto (texto que llega, una gráfica que se dibuja, una tabla que se abre) baja al
 *     final, siempre que la persona esté cerca del final. Si sube a leer algo, deja de
 *     seguir hasta que vuelva abajo o envíe otra pregunta.
 * EN: Makes the page follow the answer while it grows: every time the thread changes
 *     height (incoming text, a chart being drawn, a table opening) it scrolls to the end,
 *     as long as the person is near the end. If they scroll up to read, it stops following
 *     until they come back down or send another question.
 */
import { useEffect, useRef, type RefObject } from "react";

const NEAR_BOTTOM_PX = 160;

const distanceToBottom = () =>
  document.documentElement.scrollHeight - window.scrollY - window.innerHeight;

const scrollToEnd = () =>
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });

export function useStickToBottom<T extends HTMLElement>(
  thread: RefObject<T | null>,
  userMessages: number,
): void {
  const following = useRef(true);
  useEffect(() => {
    const onScroll = () => {
      following.current = distanceToBottom() < NEAR_BOTTOM_PX;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const element = thread.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (following.current) scrollToEnd();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [thread]);
  // ES: Una pregunta nueva siempre vuelve a seguir la respuesta.
  // EN: A new question always resumes following the answer.
  useEffect(() => {
    following.current = true;
    scrollToEnd();
  }, [userMessages]);
}
