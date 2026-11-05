/**
 * ES: Ejecuta una tarea por cada negocio registrado, en paralelo y por separado (X-05): el
 *     fallo de un negocio no detiene a los demás ni expone sus datos. Del error solo se
 *     registra el mensaje, sin cuerpo ni datos del negocio.
 * EN: Runs a task for each registered business, in parallel and separately (X-05): one
 *     business failing neither stops the others nor exposes its data. Only the error message
 *     is logged, without a body or business data.
 */
import type { BusinessConfig } from "./business-registry";

export type BusinessOutcome<T> =
  { businessId: string; ok: true; value: T } | { businessId: string; ok: false };

export async function forEachBusiness<T>(
  businesses: BusinessConfig[],
  task: (business: BusinessConfig) => Promise<T>,
): Promise<BusinessOutcome<T>[]> {
  const settled = await Promise.allSettled(businesses.map((business) => task(business)));
  return settled.map((result, index) => {
    const businessId = businesses[index]?.id ?? "desconocido";
    if (result.status === "fulfilled") return { businessId, ok: true, value: result.value };
    const reason = result.reason instanceof Error ? result.reason.message : "error desconocido";
    console.error(`La tarea del negocio ${businessId} falló:`, reason);
    return { businessId, ok: false };
  });
}
