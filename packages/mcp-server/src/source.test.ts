import { afterEach, describe, expect, it } from "vitest";
import { createSource, stableStringify } from "./source";
import { connectTestClient } from "./testing/connect";

const base = {
  tool: "audience_reach",
  endpoints: ["POST /v1/campaigns/preview"],
  dataAsOf: "2026-10-31",
};

describe("createSource", () => {
  it("da ids distintos a consultas con el mismo endpoint y distintos argumentos", () => {
    const atRisk = createSource({ ...base, params: { audience: { segment_id: "at_risk" } } });
    const dormant = createSource({ ...base, params: { audience: { segment_id: "dormant" } } });
    expect(atRisk.id).not.toBe(dormant.id);
  });

  it("da el mismo id a la misma consulta aunque cambie el orden de los argumentos", () => {
    const first = createSource({
      ...base,
      params: { channels: ["whatsapp"], audience: { tier: "gold", segment_id: "at_risk" } },
    });
    const second = createSource({
      ...base,
      params: { audience: { segment_id: "at_risk", tier: "gold" }, channels: ["whatsapp"] },
    });
    expect(first.id).toBe(second.id);
  });

  it("serializa con claves ordenadas y omite valores indefinidos", () => {
    expect(stableStringify({ b: 1, a: { d: undefined, c: [2, "x"] } })).toBe(
      '{"a":{"c":[2,"x"]},"b":1}',
    );
  });
});

describe("source.id por consulta en el servidor MCP", () => {
  let session: Awaited<ReturnType<typeof connectTestClient>>;

  afterEach(async () => {
    await session.close();
  });

  it("audience_reach de dos segmentos produce dos fuentes distintas", async () => {
    session = await connectTestClient();
    type Payload = { source: { id: string } };
    const atRisk = await session.call<Payload>("audience_reach", {
      audience: { segment_id: "at_risk" },
    });
    const dormant = await session.call<Payload>("audience_reach", {
      audience: { segment_id: "dormant" },
    });
    expect(atRisk.payload.source.id).not.toBe(dormant.payload.source.id);
  });
});
