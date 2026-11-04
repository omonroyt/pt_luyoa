/**
 * ES: Hash del contenido aprobado. El JSON se serializa de forma canónica (llaves
 *     ordenadas en todos los niveles) para que el mismo contenido produzca siempre el
 *     mismo hash y cualquier cambio, por mínimo que sea, produzca otro.
 * EN: Hash of the approved content. JSON is serialized canonically (keys sorted at
 *     every level) so the same content always yields the same hash and any change,
 *     however small, yields a different one.
 */
import { createHash } from "node:crypto";

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  const entries = Object.entries(value)
    .filter(([, nested]) => nested !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalJson(nested)}`);
  return `{${entries.join(",")}}`;
}

export function contentHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}
