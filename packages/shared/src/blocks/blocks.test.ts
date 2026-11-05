import { describe, expect, it } from "vitest";
import { CampaignCardBlock, messageLength } from "./campaign-card";
import { ChartBlock, MAX_CHART_POINTS } from "./chart";
import { CiteSourcesBlock } from "./cite-sources";
import { KpisBlock } from "./kpis";
import { MAX_TABLE_ROWS, TableBlock } from "./table";

const SOURCE = "src_d9f5b950bf";
const BASE = {
  title: "Octubre vs septiembre 2026",
  period: { from: "2026-10-01", to: "2026-10-31", label: "octubre 2026" },
  sources: [SOURCE],
};

const KPIS = {
  ...BASE,
  comparisonLabel: "vs septiembre",
  items: [
    { key: "net_sales", label: "Ventas netas", value: 808254, unit: "mxn", deltaPct: 4.2 },
    { key: "tickets", label: "Tickets", value: 8680, unit: "count", deltaPct: 5.6 },
  ],
};

const CHART = {
  ...BASE,
  kind: "bar",
  x: { key: "location", label: "Sucursal" },
  series: [{ key: "net_sales", label: "Ventas netas", unit: "mxn" }],
  data: [
    { location: "Polanco", net_sales: 396598 },
    { location: "Roma Norte", net_sales: 182498 },
  ],
};

const CARD = {
  ...BASE,
  state: "proposal",
  name: "Te extrañamos",
  objective: "Recuperar clientes en riesgo",
  audience: { filters: { segment_id: "at_risk" }, description: "Clientes en riesgo" },
  channel: "whatsapp",
  reach: {
    matched: 483,
    reachable: 267,
    excludedNoConsent: 214,
    excludedSuspended: 0,
    excludedDuplicates: 2,
  },
  offer: {
    type: "free_item",
    productId: "prd_concha",
    validFrom: "2026-11-01",
    validTo: "2026-11-14",
  },
  economics: {
    costPerRedemption: 10,
    marginNote: "Cuesta $10 por canje",
    totalCostRange: [310, 960],
  },
  history: [{ name: "Te extrañamos", lift: 23.9, n: 410, reliable: true }],
  message: { text: "¡Te extrañamos!", length: 15, limit: 1024 },
  warnings: [],
};

describe("bloques visuales", () => {
  it("aceptan bloques completos de cada tipo", () => {
    expect(KpisBlock.safeParse(KPIS).success).toBe(true);
    expect(ChartBlock.safeParse(CHART).success).toBe(true);
    expect(CampaignCardBlock.safeParse(CARD).success).toBe(true);
    expect(CiteSourcesBlock.safeParse({ sources: [SOURCE] }).success).toBe(true);
    const table = {
      ...BASE,
      columns: [
        { key: "segment", label: "Segmento" },
        { key: "reachable", label: "Alcance", unit: "count" },
      ],
      rows: [{ segment: "En riesgo", reachable: 267 }],
    };
    expect(TableBlock.safeParse(table).success).toBe(true);
  });

  it("exigen al menos una fuente con el formato de source.id", () => {
    expect(KpisBlock.safeParse({ ...KPIS, sources: [] }).success).toBe(false);
    const invented = KpisBlock.safeParse({ ...KPIS, sources: ["ventas de octubre"] });
    expect(invented.success).toBe(false);
    expect(invented.error?.issues[0]?.message).toContain("source.id exacto");
  });

  it("limitan los indicadores a entre 2 y 4", () => {
    const [first] = KPIS.items;
    expect(KpisBlock.safeParse({ ...KPIS, items: [first] }).success).toBe(false);
    expect(KpisBlock.safeParse({ ...KPIS, items: Array(5).fill(first) }).success).toBe(false);
  });

  it("limitan el tamaño de gráficas y tablas", () => {
    const point = { location: "Polanco", net_sales: 1 };
    const tooMany = Array(MAX_CHART_POINTS + 1).fill(point);
    expect(ChartBlock.safeParse({ ...CHART, data: tooMany }).success).toBe(false);
    const series = Array(5).fill({ key: "a", label: "A", unit: "count" });
    expect(ChartBlock.safeParse({ ...CHART, series }).success).toBe(false);
    const rows = Array(MAX_TABLE_ROWS + 1).fill({ a: 1, b: 2 });
    const columns = [
      { key: "a", label: "A" },
      { key: "b", label: "B" },
    ];
    expect(TableBlock.safeParse({ ...BASE, columns, rows }).success).toBe(false);
  });

  it("cuenta la longitud del mensaje en unidades UTF-16: un emoji cuenta 2", () => {
    expect(messageLength("¡Hola!")).toBe(6);
    expect(messageLength("¡Hola! 🥐")).toBe(9);
  });

  it("rechaza una tarjeta con canal o estado fuera del catálogo", () => {
    expect(CampaignCardBlock.safeParse({ ...CARD, channel: "sms" }).success).toBe(false);
    expect(CampaignCardBlock.safeParse({ ...CARD, state: "approved" }).success).toBe(false);
  });
});
