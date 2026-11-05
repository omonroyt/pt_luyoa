/**
 * ES: Texto del agente en Markdown. react-markdown no interpreta HTML crudo, así que un
 *     texto con etiquetas no puede inyectar contenido en la página.
 * EN: Agent text in Markdown. react-markdown does not interpret raw HTML, so text with tags
 *     cannot inject content into the page.
 */
import ReactMarkdown from "react-markdown";

export function MarkdownText({ text }: { text: string }) {
  return (
    <div className="space-y-2 leading-relaxed [&_li]:ml-5 [&_ol]:list-decimal [&_strong]:font-semibold [&_ul]:list-disc">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}
