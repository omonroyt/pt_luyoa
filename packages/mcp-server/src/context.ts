import { fetchBusiness, fetchLocations, fetchSegments } from "./api/endpoints";
import type { ApiClient } from "./api/http-client";
import type { Business, Location, Segment } from "./api/schemas";
import type { ApprovalStore } from "./approvals/approval-store";
import type { DataWindow } from "./domain/periods";
import { ToolFailure } from "./errors";

export type BusinessSnapshot = {
  business: Business;
  locations: Location[];
  segments: Segment[];
  window: DataWindow;
  endpoints: string[];
};

export type ApprovalSettings = { secret: string; store: ApprovalStore };

export type ToolContext = {
  api: ApiClient;
  now: () => Date;
  approvals?: ApprovalSettings;
  getSnapshot(): Promise<BusinessSnapshot>;
};

export type ToolContextOptions = { now?: () => Date; approvals?: ApprovalSettings };

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
export function createToolContext(api: ApiClient, options: ToolContextOptions = {}): ToolContext {
  let pending: Promise<BusinessSnapshot> | undefined;
  return {
    api,
    now: options.now ?? (() => new Date()),
    approvals: options.approvals,
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

/**
 * ES: Devuelve la configuración de aprobaciones o rechaza la escritura: sin llave de
 *     firma no hay forma de verificar que una persona aprobó.
 * EN: Returns the approval settings or rejects the write: without a signing key there
 *     is no way to verify that a person approved.
 */
export function requireApprovals(ctx: ToolContext): ApprovalSettings {
  if (!ctx.approvals) {
    throw new ToolFailure({
      code: "approval_required",
      message: "Las escrituras están deshabilitadas en este servidor: falta APPROVAL_SECRET.",
      suggestion:
        "Crear y enviar campañas solo es posible desde la aplicación, con aprobación de la persona.",
    });
  }
  return ctx.approvals;
}
