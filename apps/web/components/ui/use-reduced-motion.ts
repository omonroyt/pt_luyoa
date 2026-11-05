/**
 * ES: Indica si la persona pidió movimiento reducido en su sistema; las gráficas y las
 *     cifras animadas lo respetan y se muestran completas desde el inicio.
 * EN: Tells whether the person asked for reduced motion in their system; charts and
 *     animated figures honor it and show in full from the start.
 */
import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
