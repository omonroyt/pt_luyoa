/**
 * ES: Construye el modelo del agente sobre OpenRouter con dos políticas de
 *     ELECCION_DE_MODELO: (1) solo el proveedor original cuando se conoce, sin respaldo de
 *     otros proveedores, y nunca versiones de precisión reducida (fp4, int4, int8), que
 *     degradan las llamadas a herramientas; (2) esfuerzo de razonamiento bajo, adecuado
 *     para un chat en vivo. Sin respaldo porque en la corrida de humo de M6 un proveedor
 *     de respaldo devolvió una llamada a herramienta incompleta y el turno falló.
 * EN: Builds the agent model on OpenRouter with two policies from ELECCION_DE_MODELO:
 *     (1) only the original provider when it is known, with no fallback to other
 *     providers, and never reduced-precision builds (fp4, int4, int8), which degrade tool
 *     calls; (2) low reasoning effort, suited to a live chat. No fallback because in the
 *     M6 smoke run a fallback provider returned an incomplete tool call and the turn failed.
 */
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

// ES: Precisiones permitidas. "unknown" cubre a los proveedores que no la publican,
//     como los fabricantes de modelos cerrados.
// EN: Allowed precisions. "unknown" covers providers that do not publish it, such as
//     closed-model vendors.
export const ALLOWED_QUANTIZATIONS = ["fp8", "fp16", "bf16", "fp32", "unknown"];

// ES: Proveedor original de cada familia, según el endpoint de OpenRouter.
// EN: Original provider of each family, per the OpenRouter endpoints API.
const ORIGINAL_PROVIDER: Record<string, string> = {
  "z-ai": "z-ai",
  deepseek: "deepseek",
  anthropic: "anthropic",
  openai: "openai",
  google: "google-ai-studio",
};

export type ModelOptions = {
  apiKey: string;
  modelId: string;
  reasoningEffort?: "low" | "medium" | "high";
};

export function providerRouting(modelId: string) {
  const original = ORIGINAL_PROVIDER[modelId.split("/")[0] ?? ""];
  return {
    ...(original ? { order: [original] } : {}),
    allow_fallbacks: !original,
    quantizations: ALLOWED_QUANTIZATIONS,
  };
}

export function createAgentModel(options: ModelOptions): LanguageModel {
  const openrouter = createOpenRouter({ apiKey: options.apiKey });
  return openrouter(options.modelId, {
    usage: { include: true },
    provider: providerRouting(options.modelId),
    reasoning: { effort: options.reasoningEffort ?? "low" },
  });
}
