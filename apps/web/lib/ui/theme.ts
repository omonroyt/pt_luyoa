/**
 * ES: Tema claro u oscuro. La preferencia se guarda en localStorage; sin preferencia manda
 *     la del sistema. Un script en línea la aplica en <html data-theme> antes de pintar,
 *     así que no hay destello al cargar (guía "Preventing Flash" de Next 16).
 * EN: Light or dark theme. The preference is stored in localStorage; without one, the
 *     system preference applies. An inline script applies it to <html data-theme> before
 *     painting, so there is no flash on load (Next 16 "Preventing Flash" guide).
 */
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "alborada-theme";

export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export function currentTheme(root: HTMLElement = document.documentElement): Theme {
  return root.dataset.theme === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ES: Sin almacenamiento (modo privado) el tema solo dura la visita.
    // EN: Without storage (private mode) the theme only lasts for the visit.
  }
}

export const oppositeTheme = (theme: Theme): Theme => (theme === "dark" ? "light" : "dark");
