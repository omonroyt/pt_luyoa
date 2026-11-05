/**
 * ES: fetch que usa el MCP durante una corrida: primero las fallas inyectadas del caso,
 *     luego el doble de escrituras y, para todo lo demás, la API real. Las lecturas como
 *     POST /v1/campaigns/preview siguen yendo a la API.
 * EN: fetch used by the MCP during a run: first the case's injected faults, then the
 *     write double and, for everything else, the real API. Reads such as
 *     POST /v1/campaigns/preview still go to the API.
 */
import type { Fault } from "../cases/case-schema";
import { createCampaignDouble } from "./campaign-double";

const FAULT_CODES: Record<Fault["status"], string> = {
  401: "unauthorized",
  404: "not_found",
  422: "validation_error",
  429: "rate_limited",
  503: "unavailable",
};

export type FaultHit = { method: string; path: string; status: number };

function faultResponse(status: Fault["status"]): Response {
  // ES: Retry-After en 0 para que los reintentos del MCP no alarguen la corrida.
  // EN: Retry-After set to 0 so the MCP retries do not lengthen the run.
  const headers = { "Content-Type": "application/json", "Retry-After": "0" };
  const body = { error: { code: FAULT_CODES[status], message: `Falla simulada ${status}.` } };
  return new Response(JSON.stringify(body), { status, headers });
}

function requestParts(input: string | URL | Request, init?: RequestInit) {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const body = typeof init?.body === "string" ? init.body : undefined;
  return { method, path: url.pathname, body };
}

export function createEvalFetch(
  faults: Fault[],
  realFetch: typeof fetch = fetch,
  now?: () => Date,
) {
  const remaining = faults.map((fault) => ({ ...fault }));
  const faultHits: FaultHit[] = [];
  const double = createCampaignDouble(now);

  const evalFetch = async (input: string | URL | Request, init?: RequestInit) => {
    const { method, path, body } = requestParts(input, init);
    const fault = remaining.find(
      (item) => item.times > 0 && item.method === method && item.path === path,
    );
    if (fault) {
      fault.times -= 1;
      faultHits.push({ method, path, status: fault.status });
      return faultResponse(fault.status);
    }
    return double.handle(method, path, body) ?? realFetch(input, init);
  };

  return { fetch: evalFetch as typeof fetch, writes: double.writes, faultHits };
}
