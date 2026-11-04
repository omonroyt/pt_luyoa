/**
 * ES: Funciones tipadas por endpoint. Las herramientas usan solo estas funciones,
 *     nunca rutas ni parámetros sueltos.
 * EN: Typed functions per endpoint. Tools only use these functions, never raw
 *     paths or parameters.
 */
import { z } from "zod";
import { ToolFailure } from "../errors";
import type { ApiClient, ApiResponse } from "./http-client";
import {
  AnalyticsResponse,
  AudiencePreview,
  Business,
  Campaign,
  CampaignWriteResult,
  CustomerSummary,
  listOf,
  Location,
  Product,
  SalesRow,
  Segment,
  VisitsRow,
  type CHANNELS,
} from "./schemas";

export type SalesGroupBy =
  "day" | "week" | "month" | "weekday" | "hour" | "location" | "category" | "product";
export type VisitsGroupBy = Exclude<SalesGroupBy, "category" | "product">;

export type AnalyticsQuery = {
  from: string;
  to: string;
  location_id?: string;
};

export type CustomerFilters = {
  segment?: string;
  home_location_id?: string;
  inactive_days_min?: number;
  card_status?: string;
  tier?: string;
};

export type AudienceFilters = {
  segment_id?: string;
  home_location_id?: string;
  tier?: string;
  inactive_days_min?: number;
  min_visits?: number;
};

const MAX_PAGE_SIZE = 100;

export const fetchBusiness = (api: ApiClient) => api.get("/v1/business", Business);

export const fetchLocations = (api: ApiClient) => api.get("/v1/locations", listOf(Location));

export const fetchSegments = (api: ApiClient) => api.get("/v1/segments", listOf(Segment));

export const fetchProducts = (api: ApiClient) =>
  api.get("/v1/products", listOf(Product), { limit: MAX_PAGE_SIZE });

export const fetchCampaigns = (api: ApiClient) =>
  api.get("/v1/campaigns", listOf(Campaign), { limit: MAX_PAGE_SIZE });

export const fetchCampaign = (api: ApiClient, id: string) =>
  api.get(`/v1/campaigns/${encodeURIComponent(id)}`, Campaign);

export const fetchCustomer = (api: ApiClient, id: string) =>
  api.get(`/v1/customers/${encodeURIComponent(id)}`, CustomerSummary);

export const fetchSales = (
  api: ApiClient,
  groupBy: SalesGroupBy,
  query: AnalyticsQuery & { customer_type?: "member" | "anonymous" },
) => api.get("/v1/analytics/sales", AnalyticsResponse(SalesRow), { group_by: groupBy, ...query });

export const fetchVisits = (api: ApiClient, groupBy: VisitsGroupBy, query: AnalyticsQuery) =>
  api.get("/v1/analytics/visits", AnalyticsResponse(VisitsRow), { group_by: groupBy, ...query });

/**
 * ES: Cuenta clientes con un filtro pidiendo una sola fila y leyendo pagination.total.
 * EN: Counts customers for a filter by requesting a single row and reading pagination.total.
 */
export async function countCustomers(
  api: ApiClient,
  filters: CustomerFilters,
): Promise<ApiResponse<number>> {
  const response = await api.get("/v1/customers", listOf(CustomerSummary), {
    ...filters,
    limit: 1,
  });
  const total = response.data.pagination?.total;
  if (total === undefined) {
    throw new ToolFailure({
      code: "upstream_error",
      message: "La API no devolvió el total de clientes.",
    });
  }
  return { data: total, endpoint: response.endpoint };
}

export const previewAudience = (
  api: ApiClient,
  channel: (typeof CHANNELS)[number],
  audience: AudienceFilters,
) => api.post("/v1/campaigns/preview", AudiencePreview, { channel, audience });

export const createCampaign = (api: ApiClient, body: Record<string, unknown>) =>
  api.post("/v1/campaigns", CampaignWriteResult, body);

/**
 * ES: El cuerpo de la respuesta de /send no se interpreta; el estado se confirma después
 *     releyendo la campaña (ver tools/send-campaign.ts).
 * EN: The /send response body is not interpreted; the state is confirmed afterwards by
 *     re-reading the campaign (see tools/send-campaign.ts).
 */
export const sendCampaign = (api: ApiClient, id: string) =>
  api.post(`/v1/campaigns/${encodeURIComponent(id)}/send`, z.unknown(), {});
