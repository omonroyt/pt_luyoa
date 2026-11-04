/**
 * ES: Cargadores compartidos por las herramientas de campañas: campañas con métricas y
 *     nombre de producto, y la línea base de la oferta (ticket promedio y margen bruto).
 * EN: Loaders shared by the campaign tools: campaigns with metrics and product name, and
 *     the offer baseline (average ticket and gross margin).
 */
import { fetchCampaigns, fetchProducts, fetchSales } from "../api/endpoints";
import type { Product } from "../api/schemas";
import type { BusinessSnapshot, ToolContext } from "../context";
import { campaignMetrics, type CampaignSummary } from "../domain/campaigns";
import { roundTo } from "../domain/metrics";
import type { OfferBaseline } from "../domain/offers";
import { resolvePeriod } from "../domain/periods";
import { summarizeSales } from "../domain/summaries";

export async function loadCampaigns(ctx: ToolContext): Promise<{
  campaigns: CampaignSummary[];
  products: Product[];
  endpoints: string[];
}> {
  const [campaigns, products] = await Promise.all([
    fetchCampaigns(ctx.api),
    fetchProducts(ctx.api),
  ]);
  const productNames = new Map(products.data.data.map((product) => [product.id, product.name]));
  return {
    campaigns: campaigns.data.data.map((campaign) =>
      campaignMetrics(campaign, productNames.get(campaign.offer_product_id ?? "")),
    ),
    products: products.data.data,
    endpoints: [campaigns.endpoint, products.endpoint],
  };
}

export async function loadOfferBaseline(
  ctx: ToolContext,
  snapshot: BusinessSnapshot,
): Promise<{ baseline: OfferBaseline; endpoint: string }> {
  const period = resolvePeriod("last_3_months", snapshot.window);
  const response = await fetchSales(ctx.api, "location", { from: period.from, to: period.to });
  const totals = summarizeSales(response.data.data);
  return {
    baseline: {
      avgTicket: totals.avg_ticket,
      grossMargin: totals.net_sales === 0 ? 0 : roundTo(totals.gross_profit / totals.net_sales, 4),
    },
    endpoint: response.endpoint,
  };
}
