import { describe, expect, it } from "vitest";
import { matchesSource, verifyBlock } from "./figure-verifier";
import { createSourceRegistry, seedFromMessages } from "./source-registry";

const mcpResult = (payload: object) => ({
  content: [{ type: "text", text: JSON.stringify(payload) }],
});

const SEGMENTS = {
  data: {
    segments: [
      { id: "at_risk", customers: 483 },
      { id: "dormant", customers: 367 },
    ],
  },
  source: { id: "src_aaaaaaaaaa", tool: "customer_segments" },
};
const REACH = {
  data: {
    by_channel: [
      {
        channel: "whatsapp",
        matched: 483,
        reachable: 267,
        excluded_no_consent: 214,
        excluded_suspended: 0,
        excluded_duplicates: 2,
      },
    ],
  },
  source: { id: "src_bbbbbbbbbb", tool: "audience_reach" },
};
const ECONOMICS = {
  data: { cost_per_redemption: 10, total_cost: { low: 310, high: 960 }, consent: 0.5569 },
  source: { id: "src_cccccccccc", tool: "offer_economics" },
};

const CREATED = {
  data: { campaign_id: "cmp_test01", status: "draft" },
  source: { id: "src_dddddddddd", tool: "create_campaign_draft" },
};

function registry() {
  const sources = createSourceRegistry();
  [SEGMENTS, REACH, ECONOMICS, CREATED].forEach((payload) => sources.register(mcpResult(payload)));
  return sources;
}

const BASE = { title: "t", period: { from: "2026-10-01", to: "2026-10-31" } };
const kpis = (values: number[], sources = ["src_aaaaaaaaaa"]) => ({
  ...BASE,
  sources,
  items: values.map((value, index) => ({ key: `k${index}`, label: "x", value, unit: "count" })),
});

const CARD = {
  ...BASE,
  state: "proposal",
  sources: ["src_bbbbbbbbbb", "src_cccccccccc"],
  channel: "whatsapp",
  reach: {
    matched: 483,
    reachable: 267,
    excludedNoConsent: 214,
    excludedSuspended: 0,
    excludedDuplicates: 2,
  },
  economics: { costPerRedemption: 10, marginNote: "m", totalCostRange: [310, 960] },
  history: [],
  message: { text: "¡Te extrañamos!" },
};

describe("matchesSource", () => {
  it("acepta el redondeo a los decimales mostrados y la proporción como porcentaje", () => {
    expect(matchesSource(181.67, 181.6667)).toBe(true);
    expect(matchesSource(182, 181.67)).toBe(true);
    expect(matchesSource(55.7, 0.5569)).toBe(true);
    expect(matchesSource(4.2, 4.2)).toBe(true);
  });

  it("rechaza cifras distintas", () => {
    expect(matchesSource(850, 483)).toBe(false);
    expect(matchesSource(181.7, 181.6)).toBe(false);
  });
});

describe("verifyBlock", () => {
  it("aprueba un bloque cuyas cifras salen de la fuente citada", () => {
    expect(verifyBlock("show_kpis", kpis([483, 367]), registry())).toEqual([]);
  });

  it("rechaza una suma que ninguna herramienta calculó", () => {
    const problems = verifyBlock("show_kpis", kpis([483, 850]), registry());
    expect(problems.join(" ")).toContain("850");
  });

  it("rechaza fuentes que no pertenecen a la conversación", () => {
    const problems = verifyBlock("show_kpis", kpis([483, 367], ["src_ffffffffff"]), registry());
    expect(problems.join(" ")).toContain("src_ffffffffff no es un resultado de esta conversación");
  });

  it("solo busca cifras en las fuentes citadas, no en todas las de la conversación", () => {
    const problems = verifyBlock("show_kpis", kpis([483, 267]), registry());
    expect(problems.join(" ")).toContain("267");
  });

  it("aprueba la tarjeta con el alcance de audience_reach y el mensaje dentro del límite", () => {
    expect(verifyBlock("show_campaign_card", CARD, registry())).toEqual([]);
  });

  it("rechaza la tarjeta si su alcance no coincide con audience_reach", () => {
    const card = { ...CARD, reach: { ...CARD.reach, reachable: 454 } };
    const problems = verifyBlock("show_campaign_card", card, registry());
    expect(problems.join(" ")).toContain("reach.reachable debe ser 267");
  });

  it("exige citar audience_reach y respetar el límite del canal", () => {
    const card = {
      ...CARD,
      sources: ["src_cccccccccc"],
      channel: "push",
      reach: { ...CARD.reach },
      message: { text: "x".repeat(150) },
    };
    const problems = verifyBlock("show_campaign_card", card, registry()).join(" ");
    expect(problems).toContain("debe citar el resultado de audience_reach");
    expect(problems).toContain("el límite de push es 140");
  });

  it("muestra un borrador solo con el campaignId que devolvió create_campaign_draft", () => {
    const draft = {
      ...CARD,
      state: "draft",
      campaignId: "cmp_test01",
      sources: ["src_dddddddddd", "src_bbbbbbbbbb", "src_cccccccccc"],
    };
    expect(verifyBlock("show_campaign_card", draft, registry())).toEqual([]);
  });

  it("rechaza una tarjeta enviada que no cita la escritura que la respalda", () => {
    const sent = { ...CARD, state: "sent", campaignId: "cmp_inventada" };
    const problems = verifyBlock("show_campaign_card", sent, registry()).join(" ");
    expect(problems).toContain("debe llevar el campaignId que devolvió create_campaign_draft");
  });
});

describe("seedFromMessages", () => {
  it("registra los resultados de herramientas que vienen en el historial", () => {
    const sources = createSourceRegistry();
    seedFromMessages(sources, [
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "customer_segments",
            toolCallId: "c1",
            state: "output-available",
            input: {},
            output: mcpResult(SEGMENTS),
          },
        ],
      },
    ]);
    expect(sources.get("src_aaaaaaaaaa")?.numbers).toEqual([483, 367]);
  });
});
