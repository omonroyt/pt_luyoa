import { afterEach, describe, expect, it } from "vitest";
import { connectTestClient } from "../testing/connect";

type Output<TData> = {
  data: TData;
  notes: string[];
  warnings: string[];
  source: { endpoints: string[] };
};
type SegmentsData = {
  home_location: string | null;
  segments: Array<{ id: string; customers: number }>;
};
type ReachData = {
  matched: number;
  best_channel_by_reach: string;
  by_channel: Array<{ channel: string; reachable: number; excluded_no_consent: number }>;
};
type LocationData = {
  most_concerning: string | null;
  locations: Array<{
    id: string;
    concern: { level: string; score: number; reasons: string[] };
    change: { net_sales: { percent: number | null } };
    monthly_series: unknown[];
    risk_customers: { at_risk: number; dormant: number };
  }>;
};

let session: Awaited<ReturnType<typeof connectTestClient>>;

afterEach(async () => {
  await session.close();
});

describe("customer_segments", () => {
  it("reporta el tamaño de los segmentos que se están perdiendo", async () => {
    session = await connectTestClient();
    const { payload } = await session.call<Output<SegmentsData>>("customer_segments", {
      segment_ids: ["at_risk", "dormant"],
    });
    expect(payload.data.segments).toEqual([
      expect.objectContaining({ id: "at_risk", customers: 483 }),
      expect.objectContaining({ id: "dormant", customers: 367 }),
    ]);
    expect(payload.notes.join(" ")).toContain("audience_reach");
  });

  it("cuenta por sucursal desde /customers y lo advierte", async () => {
    session = await connectTestClient();
    const { isError, payload } = await session.call<Output<SegmentsData>>("customer_segments", {
      segment_ids: ["at_risk", "dormant"],
      home_location_id: "loc_roma",
    });
    expect(isError).toBe(false);
    expect(payload.data.home_location).toBe("Roma Norte");
    expect(payload.source.endpoints[0]).toContain("segment=at_risk");
    expect(payload.warnings[0]).toContain("/v1/segments no filtra por sucursal");
  });
});

describe("audience_reach", () => {
  it("devuelve el alcance real por canal ordenado de mayor a menor", async () => {
    session = await connectTestClient();
    const { payload } = await session.call<Output<ReachData>>("audience_reach", {
      audience: { segment_id: "at_risk" },
    });
    expect(payload.data.matched).toBe(483);
    expect(payload.data.by_channel.map((row) => [row.channel, row.reachable])).toEqual([
      ["email", 330],
      ["whatsapp", 267],
      ["push", 242],
    ]);
    expect(payload.data.best_channel_by_reach).toBe("email");
    expect(payload.notes[0]).toContain("reachable");
  });
});

describe("location_health", () => {
  it("señala la sucursal más preocupante con reglas y razones explícitas", async () => {
    session = await connectTestClient();
    const { isError, payload } = await session.call<Output<LocationData>>("location_health");
    expect(isError).toBe(false);
    expect(payload.data.locations).toHaveLength(3);
    const [worst] = payload.data.locations;
    expect(payload.data.most_concerning).toBe(worst?.id);
    expect(worst?.concern.reasons.length).toBeGreaterThan(0);
    expect(worst?.monthly_series).toHaveLength(12);
    expect(payload.notes[0]).toContain("propio historial");
  });
});
