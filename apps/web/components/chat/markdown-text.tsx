/**
 * ES: Texto del agente en Markdown, con tipografía de lectura: párrafos amplios, viñetas
 *     del color del acento y negritas en el color del texto. react-markdown no interpreta
 *     HTML crudo, así que un texto con etiquetas no puede inyectar contenido en la página.
 * EN: Agent text in Markdown, with reading typography: roomy paragraphs, accent-colored
 *     bullets and bold in the text color. react-markdown does not interpret raw HTML, so
 *     text with tags cannot inject content into the page.
 */
import ReactMarkdown from "react-markdown";

export function MarkdownText({ text }: { text: string }) {
  return (
    <div className="animate-fade space-y-3 text-[15px] leading-7 [&_h1]:font-display [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-5 [&_li]:pl-1 [&_li::marker]:text-accent [&_ol]:list-decimal [&_ol]:space-y-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}
