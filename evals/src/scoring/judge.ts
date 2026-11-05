/**
 * ES: Juez con rúbrica (08 §4.2): un modelo que no compite califica cada criterio del caso
 *     y las cinco dimensiones de la rúbrica como cumple, parcial o no cumple, con una
 *     frase. Recibe la pregunta, la respuesta con sus bloques y un resumen de los
 *     resultados de herramientas, para que juzgue contra lo que el agente sí sabía.
 * EN: Rubric judge (08 §4.2): a non-competing model rates each case criterion and the five
 *     rubric dimensions as meets, partial or does not meet, with one sentence. It receives
 *     the question, the answer with its blocks and a summary of the tool results, so it
 *     judges against what the agent actually knew.
 */
import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import type { EvalCase } from "../cases/case-schema";
import type { Extracted } from "./extract";

const Verdict = z.enum(["cumple", "parcial", "no_cumple", "no_aplica"]);
const VALUES: Record<z.infer<typeof Verdict>, number | null> = {
  cumple: 1,
  parcial: 0.5,
  no_cumple: 0,
  no_aplica: null,
};

export const DIMENSIONS = {
  especificidad: "La recomendación nombra audiencia, canal, oferta, fechas y alcance concretos",
  evidencia: "Cada afirmación de oportunidad tiene métrica, valor, periodo y comparación",
  criterio_de_negocio: "Considera costo y margen; la oferta es razonable",
  advertencias: "Menciona muestra pequeña, falta de grupo de control o limitaciones cuando aplica",
  claridad: "Respuesta primero, sin relleno, entendible para alguien que no es analista",
} as const;

const Judgement = z.object({
  items: z.array(z.object({ id: z.string(), verdict: Verdict, reason: z.string() })),
});
export type JudgeItem = z.infer<typeof Judgement>["items"][number];

export type JudgeResult = {
  score: number | null;
  items: JudgeItem[];
  costUsd: number;
  error?: string;
};

const SECTION_LIMIT = 6000;
const RESULT_LIMIT = 1200;

const RULES = [
  "Eres un evaluador estricto de un copiloto de negocio para una cafetería.",
  "Califica cada criterio con cumple, parcial, no_cumple o no_aplica y una frase en español.",
  "Juzga solo con la evidencia dada. Las cifras correctas son las de los resultados de",
  "herramientas; una cifra que no aparece ahí cuenta en contra. No premies la extensión.",
  "Usa no_aplica solo si la dimensión no tiene sentido para esa pregunta.",
].join(" ");

const clip = (text: string, limit: number) =>
  text.length > limit ? `${text.slice(0, limit)}… [recortado]` : text;

export function judgePrompt(
  evalCase: EvalCase,
  extracted: Extracted,
  criteria: Map<string, string>,
) {
  const rubric = [
    ...evalCase.expect.rubric.map((id) => `- ${id}: ${criteria.get(id) ?? "(sin texto)"}`),
    ...Object.entries(DIMENSIONS).map(([id, text]) => `- ${id}: ${text}`),
  ];
  const results = extracted.mcpOutputs.map((output) => clip(JSON.stringify(output), RESULT_LIMIT));
  return [
    `PREGUNTAS DE LA PERSONA\n${evalCase.turns.map((turn) => `- ${turn.user}`).join("\n")}`,
    `RESPUESTA DEL COPILOTO (texto)\n${clip(extracted.text, SECTION_LIMIT)}`,
    `BLOQUES VISUALES MOSTRADOS\n${clip(JSON.stringify(extracted.blocks), SECTION_LIMIT)}`,
    `RESULTADOS DE HERRAMIENTAS (resumen)\n${clip(results.join("\n"), SECTION_LIMIT)}`,
    `CRITERIOS A CALIFICAR (usa estos id)\n${rubric.join("\n")}`,
  ].join("\n\n");
}

export function judgeScore(items: JudgeItem[]): number | null {
  const values = items.map((item) => VALUES[item.verdict]).filter((value) => value !== null);
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

const costOf = (metadata: unknown) =>
  (metadata as { openrouter?: { usage?: { cost?: number } } } | undefined)?.openrouter?.usage
    ?.cost ?? 0;

export async function judgeCase(
  model: LanguageModel,
  evalCase: EvalCase,
  extracted: Extracted,
  criteria: Map<string, string>,
): Promise<JudgeResult> {
  try {
    const result = await generateText({
      model,
      system: RULES,
      prompt: judgePrompt(evalCase, extracted, criteria),
      temperature: 0,
      output: Output.object({ schema: Judgement }),
    });
    const { items } = result.output;
    return { score: judgeScore(items), items, costUsd: costOf(result.providerMetadata) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { score: null, items: [], costUsd: 0, error: message.slice(0, 300) };
  }
}
