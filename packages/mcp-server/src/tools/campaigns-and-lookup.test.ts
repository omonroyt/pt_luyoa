import { afterEach, describe, expect, it } from "vitest";
import { connectTestClient } from "../testing/connect";

type Output<TData> = { data: TData; notes: string[]; warnings: string[] };
type ErrorOutput = { error: { code: string; suggestion?: string } };
type CampaignResult = {
  lift_points: number | null;
  reliability: string;
  lift_interval_points: { low: number; high: number } | null;
};
type PerformanceData = {
  campaigns: Array<{ id: string; results: CampaignResult | null }>;
  similar?: Array<{ id: string; score: number }>;
  learnings: string[];
};
type EconomicsData = {
  cost_per_redemption: number;
  product_name: string | null;
  margin_after_offer: number;
};
type ImpactData = {
  reach: { reachable: number };
  reference_campaign: { id: string } | null;
  impact: { kind: string; extra_visits?: [number, number, number]; expected_redemptions: number[] };
};
type LookupData = { item: Record<string, unknown> };

let session: Awaited<ReturnType<typeof connectTestClient>>;

afterEach(async () => {
  await session.close();
});

describe("campaign_performance", () => {
  it("ordena primero la campaña con lift medido y marca su confiabilidad", async () => {
    session = await connectTestClient();
    const { payload } = await session.call<Output<PerformanceData>>("campaign_performance");
    const [first] = payload.data.campaigns;
    expect(payload.data.campaigns).toHaveLength(4);
    expect(first?.id).toBe("cmp_0004");
    expect(first?.results).toMatchObject({ lift_points: 23.9, reliability: "media" });
    expect(
      payload.data.campaigns.slice(1).every((campaign) => campaign.results?.lift_points === null),
    ).toBe(true);
    expect(payload.data.learnings[0]).toContain("1 de 4");
    expect(payload.warnings[0]).toContain("muestra pequeña");
  });

  it("encuentra campañas parecidas a una propuesta", async () => {
    session = await connectTestClient();
    const { payload } = await session.call<Output<PerformanceData>>("campaign_performance", {
      similar_to: { channel: "whatsapp", keyword: "recuperar" },
    });
    expect(payload.data.similar?.[0]?.id).toBe("cmp_0004");
  });
});

describe("offer_economics", () => {
  it("usa el costo unitario del producto regalado", async () => {
    session = await connectTestClient();
    const { payload } = await session.call<Output<EconomicsData>>("offer_economics", {
      offer: { type: "free_item", product_id: "prd_concha" },
    });
    expect(payload.data.cost_per_redemption).toBe(10);
    expect(payload.data.product_name).toBe("Concha");
    expect(payload.data.margin_after_offer).toBeGreaterThan(0);
  });

  it("exige un producto existente y lista los válidos", async () => {
    session = await connectTestClient();
    const { isError, payload } = await session.call<ErrorOutput>("offer_economics", {
      offer: { type: "free_item", product_id: "prd_pizza" },
    });
    expect(isError).toBe(true);
    expect(payload.error.code).toBe("validation_error");
    expect(payload.error.suggestion).toContain("prd_concha");
  });
});

describe("estimate_campaign_impact", () => {
  it("estima visitas incrementales con el lift de la campaña de referencia", async () => {
    session = await connectTestClient();
    const { payload } = await session.call<Output<ImpactData>>("estimate_campaign_impact", {
      audience: { segment_id: "at_risk" },
      channel: "whatsapp",
      offer: { type: "free_item", product_id: "prd_concha" },
    });
    expect(payload.data.reach.reachable).toBe(267);
    expect(payload.data.reference_campaign?.id).toBe("cmp_0004");
    expect(payload.data.impact.kind).toBe("incremental");
    const [low, mid, high] = payload.data.impact.extra_visits ?? [0, 0, 0];
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
    expect(mid).toBe(Math.round(267 * 0.239));
  });

  it("sin referencia con control solo estima canjes y lo advierte", async () => {
    session = await connectTestClient();
    const { payload } = await session.call<Output<ImpactData>>("estimate_campaign_impact", {
      audience: { segment_id: "at_risk" },
      channel: "push",
      offer: { type: "percent_off", value: 15 },
    });
    expect(payload.data.impact.kind).toBe("redemptions_only");
    expect(payload.warnings.join(" ")).toContain("solo se estiman canjes");
  });
});

describe("lookup", () => {
  it("devuelve un cliente sin datos personales", async () => {
    session = await connectTestClient();
    const { payload } = await session.call<Output<LookupData>>("lookup", {
      kind: "customer",
      id: "cus_0001",
    });
    expect(payload.data.item).toMatchObject({ id: "cus_0001", segment: expect.any(String) });
    for (const field of [
      "first_name",
      "last_name",
      "phone",
      "email",
      "birth_date",
      "card_number",
    ]) {
      expect(payload.data.item).not.toHaveProperty(field);
    }
  });

  it("traduce un cliente inexistente a not_found", async () => {
    session = await connectTestClient();
    const { isError, payload } = await session.call<ErrorOutput>("lookup", {
      kind: "customer",
      id: "cus_no_existe",
    });
    expect(isError).toBe(true);
    expect(payload.error.code).toBe("not_found");
  });

  it("devuelve un producto con precio y costo", async () => {
    session = await connectTestClient();
    const { payload } = await session.call<Output<LookupData>>("lookup", {
      kind: "product",
      id: "prd_concha",
    });
    expect(payload.data.item).toMatchObject({ price: 34, unit_cost: 10 });
  });
});
