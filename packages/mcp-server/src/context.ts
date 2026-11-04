import { fetchBusiness, fetchLocations, fetchSegments } from "./api/endpoints";
import type { ApiClient } from "./api/http-client";
import type { Business, Location, Segment } from "./api/schemas";
import type { DataWindow } from "./domain/periods";
import { ToolFailure } from "./errors";

export type BusinessSnapshot = {
  business: Business;
  locations: Location[];
  segments: Segment[];
  window: DataWindow;
  endpoints: string[];
};

export type ToolContext = {
  api: ApiClient;
  now: () => Date;
  getSnapshot(): Promise<BusinessSnapshot>;
};

async function loadSnapshot(api: ApiClient): Promise<BusinessSnapshot> {
  const [business, locations, segments] = await Promise.all([
    fetchBusiness(api),
    fetchLocations(api),
    fetchSegments(api),
  ]);
  return {
    business: business.data,
    locations: locations.data.data,
    segments: segments.data.data,
    window: { dataFrom: business.data.data_from, dataAsOf: business.data.data_as_of },
    endpoints: [business.endpoint, locations.endpoint, segments.endpoint],
  };
}

/**
 * ES: Contexto compartido por las herramientas. La "foto" del negocio (fecha de corte,
 *     sucursales, segmentos) se carga una vez; si falla, el siguiente intento la recarga.
 * EN: Context shared by the tools. The business snapshot (cutoff date, locations,
 *     segments) is loaded once; if it fails, the next attempt reloads it.
 */
export function createToolContext(api: ApiClient, now: () => Date = () => new Date()): ToolContext {
  let pending: Promise<BusinessSnapshot> | undefined;
  return {
    api,
    now,
    getSnapshot() {
      pending ??= loadSnapshot(api).catch((error: unknown) => {
        pending = undefined;
        throw error;
      });
      return pending;
    },
  };
}

/**
 * ES: Valida que una sucursal exista y devuelve su nombre; el error lista las válidas.
 * EN: Validates that a location exists and returns its name; the error lists valid ones.
 */
export function requireLocation(snapshot: BusinessSnapshot, locationId: string): Location {
  const location = snapshot.locations.find((candidate) => candidate.id === locationId);
  if (!location) {
    const valid = snapshot.locations.map((candidate) => `${candidate.id} (${candidate.name})`);
    throw new ToolFailure({
      code: "not_found",
      message: `No existe la sucursal ${locationId}.`,
      suggestion: `Sucursales válidas: ${valid.join(", ")}.`,
    });
  }
  return location;
}
