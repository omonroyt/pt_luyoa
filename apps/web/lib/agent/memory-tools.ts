/**
 * ES: Herramientas de memoria (X-04, IMP-61): remember_preference y forget_preference.
 *     Guardan preferencias explícitas y estables del negocio en su almacén; las del
 *     almacén entran al prompt de cada conversación nueva del mismo negocio. Un valor
 *     inválido para su clave falla con el motivo y el modelo corrige.
 * EN: Memory tools (X-04, IMP-61): remember_preference and forget_preference. They store
 *     explicit, stable business preferences in its store; the stored ones enter the prompt
 *     of every new conversation of the same business. An invalid value for its key fails
 *     with the reason and the model corrects it.
 */
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { PreferenceStore } from "../memory/preference-store";
import {
  PREFERENCE_LABELS,
  PreferenceKeySchema,
  parsePreferenceValue,
} from "../memory/preferences";

export const MEMORY_TOOLS = ["remember_preference", "forget_preference"] as const;

const REMEMBER_DESCRIPTION = [
  "Guarda una preferencia explícita y estable de la dueña para sus campañas, solo cuando",
  'ella la pide o la afirma ("prefiero WhatsApp", "nunca más de 20% de descuento").',
  "Claves: preferred_channel (push, whatsapp o email), max_discount_pct (entero de 1 a 100),",
  "message_tone (texto breve), focus_location (id loc_…), avoid_products (texto breve) y",
  "campaign_duration_days (entero de 1 a 60). Nunca guardes datos de clientes ni cifras.",
].join(" ");

const FORGET_DESCRIPTION =
  "Borra una preferencia guardada cuando la dueña pide olvidarla o ya no aplica.";

export function createMemoryTools(store: PreferenceStore): ToolSet {
  return {
    remember_preference: tool({
      description: REMEMBER_DESCRIPTION,
      inputSchema: z
        .object({ key: PreferenceKeySchema, value: z.string() })
        .superRefine((input, ctx) => {
          const parsed = parsePreferenceValue(input.key, input.value);
          if (!parsed.ok)
            ctx.addIssue({ code: "custom", message: `${input.key}: ${parsed.reason}` });
        }),
      execute: async ({ key, value }) => {
        const parsed = parsePreferenceValue(key, value);
        if (!parsed.ok) throw new Error(parsed.reason);
        await store.save(key, parsed.value);
        return { saved: true, key, label: PREFERENCE_LABELS[key], value: parsed.value };
      },
    }),
    forget_preference: tool({
      description: FORGET_DESCRIPTION,
      inputSchema: z.object({ key: PreferenceKeySchema }),
      execute: async ({ key }) => ({ forgotten: await store.remove(key), key }),
    }),
  };
}
