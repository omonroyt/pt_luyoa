/**
 * ES: Preferencias del negocio (X-04, 06_DISENO_AGENTE §12.2). Solo hay claves fijas,
 *     explícitas y estables; cada una valida su valor. Nunca se guardan datos de clientes.
 *     Los valores entran al prompt como datos citados, no como instrucciones.
 * EN: Business preferences (X-04, 06_DISENO_AGENTE §12.2). There are only fixed, explicit
 *     and stable keys; each one validates its value. Customer data is never stored. Values
 *     enter the prompt as quoted data, not as instructions.
 */
import { z } from "zod";

export const PREFERENCE_KEYS = [
  "preferred_channel",
  "max_discount_pct",
  "message_tone",
  "focus_location",
  "avoid_products",
  "campaign_duration_days",
] as const;

export type PreferenceKey = (typeof PREFERENCE_KEYS)[number];

export const PreferenceKeySchema = z.enum(PREFERENCE_KEYS);

const wholeNumber = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, "Debe ser un número entero")
    .refine(
      (value) => Number(value) >= min && Number(value) <= max,
      `Debe estar entre ${min} y ${max}`,
    );

const shortText = (max: number) => z.string().trim().min(2).max(max);

const VALUE_SCHEMAS: Record<PreferenceKey, z.ZodType<string>> = {
  preferred_channel: z.enum(["push", "whatsapp", "email"]),
  max_discount_pct: wholeNumber(1, 100),
  message_tone: shortText(80),
  focus_location: z.string().regex(/^loc_[a-z0-9_]+$/, "Debe ser un id de sucursal (loc_…)"),
  avoid_products: shortText(120),
  campaign_duration_days: wholeNumber(1, 60),
};

export const PREFERENCE_LABELS: Record<PreferenceKey, string> = {
  preferred_channel: "Canal preferido",
  max_discount_pct: "Descuento máximo (%)",
  message_tone: "Tono de los mensajes",
  focus_location: "Sucursal de enfoque",
  avoid_products: "Productos a evitar",
  campaign_duration_days: "Duración de campaña (días)",
};

export type Preference = { key: PreferenceKey; value: string; updatedAt: Date };

/**
 * ES: Valida el valor de una clave; devuelve el valor normalizado o el motivo del rechazo.
 * EN: Validates a key's value; returns the normalized value or the rejection reason.
 */
export function parsePreferenceValue(
  key: PreferenceKey,
  value: string,
): { ok: true; value: string } | { ok: false; reason: string } {
  const parsed = VALUE_SCHEMAS[key].safeParse(value);
  if (parsed.success) return { ok: true, value: parsed.data };
  return { ok: false, reason: parsed.error.issues.map((issue) => issue.message).join("; ") };
}

// ES: Línea para el prompt, con el valor entre comillas para que se lea como dato.
// EN: Prompt line, with the value quoted so it reads as data.
export function preferenceLine(preference: Pick<Preference, "key" | "value">): string {
  return `${PREFERENCE_LABELS[preference.key]}: "${preference.value}"`;
}
