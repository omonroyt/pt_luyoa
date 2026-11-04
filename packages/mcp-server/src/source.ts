import { createHash } from "node:crypto";
import type { Source } from "@alborada/shared";
import type { DateRange } from "./domain/periods";

export type SourceInput = {
  tool: string;
  endpoints: string[];
  dataAsOf: string;
  period?: DateRange;
  now?: () => Date;
};

const BUSINESS_TIMEZONE = "America/Mexico_City";

/**
 * ES: Construye la procedencia de un resultado. El id es determinista (mismas
 *     consultas, mismo id) para que el agente y la interfaz lo citen de forma estable.
 * EN: Builds the provenance of a result. The id is deterministic (same queries,
 *     same id) so the agent and the UI can cite it consistently.
 */
export function createSource(input: SourceInput): Source {
  const endpoints = [...new Set(input.endpoints)];
  const digest = createHash("sha256")
    .update(`${input.tool}|${endpoints.join("|")}`)
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
