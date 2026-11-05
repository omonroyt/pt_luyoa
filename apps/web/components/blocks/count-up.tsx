"use client";

/**
 * ES: Cifra que sube desde cero hasta su valor al aparecer. Lo que se anima es solo la
 *     vista: los lectores de pantalla reciben el valor final, y con movimiento reducido se
 *     muestra completo desde el inicio.
 * EN: Figure that counts up from zero to its value when it appears. Only the view is
 *     animated: screen readers get the final value, and with reduced motion it shows in
 *     full from the start.
 */
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/components/ui/use-reduced-motion";

const DURATION_MS = 900;
const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

function useCountUp(target: number, animate: boolean): number {
  const [progress, setProgress] = useState(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(1, (now - start) / DURATION_MS);
      setProgress(easeOut(elapsed));
      if (elapsed < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, animate]);
  return animate ? target * progress : target;
}

type CountUpProps = { value: number; format: (value: number) => string };

export function CountUp({ value, format }: CountUpProps) {
  const reduced = useReducedMotion();
  const shown = useCountUp(value, !reduced);
  const isInteger = Number.isInteger(value);
  return (
    <>
      <span aria-hidden="true">{format(isInteger ? Math.round(shown) : shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
