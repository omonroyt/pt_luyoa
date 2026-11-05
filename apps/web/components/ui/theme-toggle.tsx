"use client";

/**
 * ES: Botón para cambiar entre modo claro y oscuro. Los dos íconos se dibujan siempre y el
 *     CSS muestra el que corresponde al tema activo, así que el servidor y el navegador
 *     generan el mismo HTML.
 * EN: Button to switch between light and dark mode. Both icons are always drawn and CSS
 *     shows the one for the active theme, so server and browser produce the same HTML.
 */
import { applyTheme, currentTheme, oppositeTheme } from "@/lib/ui/theme";
import { Icon } from "./icon";

export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={() => applyTheme(oppositeTheme(currentTheme()))}
      aria-label="Cambiar entre modo claro y oscuro"
      title="Cambiar entre modo claro y oscuro"
      className="grid size-10 place-items-center rounded-full border border-border bg-card/70 text-muted transition hover:text-foreground hover:shadow-soft"
    >
      <Icon name="moon" className="size-[18px] dark:hidden" />
      <Icon name="sun" className="hidden size-[18px] dark:block" />
    </button>
  );
}
