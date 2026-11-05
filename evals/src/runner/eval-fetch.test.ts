import { describe, expect, it, vi } from "vitest";
import { createEvalFetch } from "./eval-fetch";

const API = "https://api.test";
const draft = {
  name: "[eval] Te extrañamos",
  objective: "Recuperar clientes",
  channel: "whatsapp",
  audience: { segment_id: "at_risk" },
  offer: {
    type: "free_item",
    product_id: "prd_concha",
    valid_from: "2026-11-02",
    valid_to: "2026-11-20",
  },
  message: "Te extrañamos",
};

const post = (path: string, body: unknown = {}) => ({
  url: `${API}${path}`,
  init: { method: "POST", body: JSON.stringify(body) },
});

describe("fetch de evaluación", () => {
  it("deja pasar las lecturas a la API real, incluido el preview", async () => {
    const realFetch = vi.fn(async () => new Response("{}", { status: 200 }));
    const { fetch } = createEvalFetch([], realFetch);
    await fetch(`${API}/v1/analytics/sales?group_by=weekday`);
    const preview = post("/v1/campaigns/preview", { channel: "push" });
    await fetch(preview.url, preview.init);
    expect(realFetch).toHaveBeenCalledTimes(2);
  });

  it("simula crear, releer y enviar sin tocar la API, y responde 409 al reenviar", async () => {
    const realFetch = vi.fn(async () => new Response("{}", { status: 200 }));
    const { fetch, writes } = createEvalFetch([], realFetch);
    const create = post("/v1/campaigns", draft);
    const created = (await (await fetch(create.url, create.init)).json()) as { id: string };
    const stored = await (await fetch(`${API}/v1/campaigns/${created.id}`)).json();
    expect(stored).toMatchObject({
      status: "draft",
      message: "Te extrañamos",
      offer_product_id: "prd_concha",
    });

    const send = post(`/v1/campaigns/${created.id}/send`);
    expect((await fetch(send.url, send.init)).status).toBe(200);
    expect(await (await fetch(`${API}/v1/campaigns/${created.id}`)).json()).toMatchObject({
      status: "sent",
    });
    expect((await fetch(send.url, send.init)).status).toBe(409);

    expect(writes.map((write) => write.kind)).toEqual(["create", "send"]);
    expect(realFetch).not.toHaveBeenCalled();
  });

  it("inyecta la falla del caso las veces indicadas y luego responde normal", async () => {
    const realFetch = vi.fn(async () => new Response("{}", { status: 200 }));
    const { fetch, faultHits } = createEvalFetch(
      [{ method: "GET", path: "/v1/analytics/sales", status: 503, times: 2 }],
      realFetch,
    );
    const statuses = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      statuses.push((await fetch(`${API}/v1/analytics/sales?group_by=day`)).status);
    }
    expect(statuses).toEqual([503, 503, 200]);
    expect(faultHits).toHaveLength(2);
  });

  it("puede hacer fallar la creación antes de que llegue al doble", async () => {
    const { fetch, writes } = createEvalFetch([
      { method: "POST", path: "/v1/campaigns", status: 422, times: 1 },
    ]);
    const create = post("/v1/campaigns", draft);
    expect((await fetch(create.url, create.init)).status).toBe(422);
    expect(writes).toHaveLength(0);
  });
});
