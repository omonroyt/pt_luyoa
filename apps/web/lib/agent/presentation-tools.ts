/**
 * ES: Herramientas de presentación (ADR-07, IMP-32). Cuando el modelo decide que un visual
 *     ayuda, llama una de estas herramientas con datos y fuentes; la interfaz dibuja el
 *     bloque a partir de la llamada. El esquema de cada bloque vive en @alborada/shared y
 *     el AI SDK lo valida: si el modelo envía argumentos inválidos, recibe el error y
 *     corrige (07 §6, paso 1).
 * EN: Presentation tools (ADR-07, IMP-32). When the model decides a visual helps, it calls
 *     one of these tools with data and sources; the UI draws the block from the call. Each
 *     block schema lives in @alborada/shared and the AI SDK validates it: if the model
 *     sends invalid arguments, it receives the error and corrects (07 §6, step 1).
 */
import {
  CampaignCardBlock,
  ChartBlock,
  CiteSourcesBlock,
  KpisBlock,
  TableBlock,
} from "@alborada/shared";
import { tool, type ToolSet } from "ai";
import { assertVerified } from "./figure-verifier";
import type { SourceRegistry } from "./source-registry";

export const PRESENTATION_TOOLS = [
  "show_chart",
  "show_table",
  "show_kpis",
  "show_campaign_card",
  "cite_sources",
] as const;

const DESCRIPTIONS = {
  show_chart:
    "Muestra una gráfica. bar compara de 2 a 12 elementos en una métrica (p. ej. utilidad por " +
    "categoría o transacciones por día de la semana); line muestra una evolución en el tiempo; " +
    "grouped_bar compara dos periodos por elemento. Usa las cifras exactas de la herramienta.",
  show_table:
    "Muestra una tabla para listar elementos con 3 o más atributos (p. ej. campañas con canal, " +
    "oferta, n, tasas y lift, o alcance por segmento y canal). Máximo 25 filas.",
  show_kpis:
    "Muestra de 2 a 4 cifras clave con su variación, p. ej. un mes contra el anterior. Las " +
    "variaciones deben venir de la herramienta, nunca calculadas por ti.",
  show_campaign_card:
    "Muestra una propuesta de campaña con audiencia, canal, alcance real, oferta, costo, " +
    "impacto esperado, historial, mensaje y advertencias. Úsala para cualquier propuesta.",
  cite_sources:
    "Cita las fuentes (source.id) de las cifras que mencionas en el texto de la respuesta.",
} satisfies Record<(typeof PRESENTATION_TOOLS)[number], string>;

/**
 * ES: El bloque se dibuja en la interfaz a partir de los argumentos de la llamada, pero
 *     solo si pasa el verificador de cifras (IMP-33); si no, la llamada falla con la lista
 *     de problemas y el modelo corrige.
 * EN: The block is drawn in the UI from the call arguments, but only if it passes the
 *     figure verifier (IMP-33); otherwise the call fails with the list of problems and the
 *     model corrects it.
 */
function verified(name: (typeof PRESENTATION_TOOLS)[number], registry: SourceRegistry) {
  return async (block: unknown) => {
    assertVerified(name, block, registry);
    return { shown: true };
  };
}

export function createPresentationTools(registry: SourceRegistry): ToolSet {
  return {
    show_chart: tool({
      description: DESCRIPTIONS.show_chart,
      inputSchema: ChartBlock,
      execute: verified("show_chart", registry),
    }),
    show_table: tool({
      description: DESCRIPTIONS.show_table,
      inputSchema: TableBlock,
      execute: verified("show_table", registry),
    }),
    show_kpis: tool({
      description: DESCRIPTIONS.show_kpis,
      inputSchema: KpisBlock,
      execute: verified("show_kpis", registry),
    }),
    show_campaign_card: tool({
      description: DESCRIPTIONS.show_campaign_card,
      inputSchema: CampaignCardBlock,
      execute: verified("show_campaign_card", registry),
    }),
    cite_sources: tool({
      description: DESCRIPTIONS.cite_sources,
      inputSchema: CiteSourcesBlock,
      execute: verified("cite_sources", registry),
    }),
  };
}
