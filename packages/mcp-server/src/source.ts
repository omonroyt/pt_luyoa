import { createHash } from "node:crypto";
import type { Source } from "@alborada/shared";
import type { DateRange } from "./domain/periods";

export type SourceInput = {
  tool: string;
  endpoints: string[];
  dataAsOf: string;
  /**
   * ES: Argumentos de la herramienta. Distinguen consultas cuyo endpoint es el mismo,
   *     como un POST con otro cuerpo o una opción que no viaja en la URL (top, similar_to).
   * EN: Tool arguments. They distinguish queries with the same endpoint, such as a POST
   *     with another body or an option that does not travel in the URL (top, similar_to).
   */
  params: unknown;
  period?: DateRange;
  now?: () => Date;
};

const BUSINESS_TIMEZONE = "America/Mexico_City";

/**
 * ES: JSON con las claves ordenadas: la misma consulta produce el mismo texto aunque el
 *     agente envíe los argumentos en otro orden.
 * EN: JSON with sorted keys: the same query produces the same text even if the agent
 *     sends the arguments in another order.
 */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * ES: Construye la procedencia de un resultado. El id es determinista y único por consulta
 *     (herramienta, endpoints y argumentos): la misma consulta da el mismo id y dos
 *     consultas distintas nunca comparten uno, para que cada cita apunte a un solo
 *     resultado (B-06).
 * EN: Builds the provenance of a result. The id is deterministic and unique per query
 *     (tool, endpoints and arguments): the same query gives the same id and two different
 *     queries never share one, so every citation points to a single result (B-06).
 */
export function createSource(input: SourceInput): Source {
  const endpoints = [...new Set(input.endpoints)];
  const digest = createHash("sha256")
    .update(`${input.tool}|${endpoints.join("|")}|${stableStringify(input.params)}`)
    .digest("hex");
  const period = input.period ? { ...input.period, timezone: BUSINESS_TIMEZONE } : undefined;
  return {
    id: `src_${digest.slice(0, 10)}`,
    tool: input.tool,
    endpoints,
    ...(period ? { period: period as Source["period"] } : {}),
    data_as_of: input.dataAsOf,
    fetched_at: (input.now ?? (() => new Date()))().toISOString(),
  };
}
