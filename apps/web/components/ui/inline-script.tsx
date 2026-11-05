/**
 * ES: Script en línea que corre mientras el navegador lee el HTML, antes de pintar. En el
 *     cliente se marca como text/plain para que React no avise por renderizar un <script>;
 *     suppressHydrationWarning acepta esa diferencia (guía "Preventing Flash" de Next 16).
 * EN: Inline script that runs while the browser parses the HTML, before painting. On the
 *     client it is marked as text/plain so React does not warn about rendering a <script>;
 *     suppressHydrationWarning accepts that difference (Next 16 "Preventing Flash" guide).
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
