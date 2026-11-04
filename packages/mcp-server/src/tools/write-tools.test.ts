import { afterEach, describe, expect, it } from "vitest";
import { createMemoryApprovalStore } from "../approvals/approval-store";
import { issueApprovalToken, verifyApprovalToken } from "../approvals/approval-token";
import {
  createApprovalContent,
  sendApprovalContent,
  sendApprovalContentFromDraft,
} from "../approvals/campaign-content";
import type { Campaign } from "../api/schemas";
import type { CampaignDraft } from "../domain/campaign-rules";
import { connectTestClient, TEST_NOW } from "../testing/connect";
import type { FixtureOverrides } from "../testing/fake-api";
import { fixtureKey } from "../testing/fixture-key";

const SECRET = "secreto-de-prueba";
const BUSINESS_ID = "biz_alborada";

const DRAFT: CampaignDraft = {
  name: "Te extrañamos noviembre",
  objective: "Recuperar clientes en riesgo",
  channel: "whatsapp",
  audience: { segment_id: "at_risk" },
  offer: {
    type: "free_item",
    product_id: "prd_concha",
    valid_from: "2026-11-10",
    valid_to: "2026-11-24",
  },
  message:
    "Hace rato que no te vemos. Tu próxima concha va por nuestra cuenta, del 10 al 24 de noviembre.",
};

const STORED_DRAFT: Campaign = {
  id: "cmp_test01",
  name: DRAFT.name,
  objective: DRAFT.objective,
  status: "draft",
  channel: "whatsapp",
  audience_description: null,
  offer_type: "free_item",
  offer_value: null,
  offer_product_id: "prd_concha",
  valid_from: "2026-11-10",
  valid_to: "2026-11-24",
  message: DRAFT.message,
  created_at: "2026-11-04T12:00:00Z",
  sent_at: null,
  audience_size: null,
  simulated: true,
  results: null,
};

const url = (path: string) => new URL(`https://api.test${path}`);
const CREATE_KEY = fixtureKey(
  "POST",
  url("/v1/campaigns"),
  JSON.stringify(createApprovalContent(DRAFT)),
);

const SENT = {
  ...STORED_DRAFT,
  status: "sent",
  sent_at: "2026-11-04T12:01:00Z",
  audience_size: 267,
};

const OVERRIDES: FixtureOverrides = {
  [CREATE_KEY]: { status: 201, body: { id: "cmp_test01", status: "draft" } },
  // ES: Antes del envío la campaña es borrador; después, enviada.
  // EN: Before sending the campaign is a draft; afterwards, sent.
  [fixtureKey("GET", url("/v1/campaigns/cmp_test01"))]: [
    { status: 200, body: STORED_DRAFT },
    { status: 200, body: SENT },
  ],
  [fixtureKey("GET", url("/v1/campaigns/cmp_sent"))]: {
    status: 200,
    body: { ...SENT, id: "cmp_sent" },
  },
  // ES: Respuesta con una forma distinta a la campaña, como la de la API real.
  // EN: Response shaped differently from the campaign, like the real API's.
  [fixtureKey("POST", url("/v1/campaigns/cmp_test01/send"), "{}")]: {
    status: 200,
    body: { campaign: { id: "cmp_test01" }, message: "Campaña enviada" },
  },
  // ES: Campaña cuyo envío la API acepta pero que sigue como borrador.
  // EN: Campaign whose send the API accepts but which stays a draft.
  [fixtureKey("GET", url("/v1/campaigns/cmp_stuck"))]: {
    status: 200,
    body: { ...STORED_DRAFT, id: "cmp_stuck" },
  },
  [fixtureKey("POST", url("/v1/campaigns/cmp_stuck/send"), "{}")]: { status: 200, body: {} },
};

type ErrorOutput = { error: { code: string; message: string; suggestion?: string } };
type CreateOutput = { data: { campaign_id: string; status: string; reach: { reachable: number } } };
type SendOutput = { data: { campaign_id: string; status: string; audience_size: number } };

let session: Awaited<ReturnType<typeof connectTestClient>>;
let store = createMemoryApprovalStore();

async function connect(withApprovals = true) {
  store = createMemoryApprovalStore();
  session = await connectTestClient(
    OVERRIDES,
    withApprovals ? { secret: SECRET, store } : undefined,
  );
}

const approve = async (action: "create" | "send", content: unknown, campaignId?: string) =>
  (
    await issueApprovalToken(
      { action, businessId: BUSINESS_ID, content, campaignId },
      { secret: SECRET, store, now: () => TEST_NOW },
    )
  ).token;

const createCalls = () => session.fetchImpl.calls.filter((call) => call === CREATE_KEY).length;

afterEach(async () => {
  await session.close();
});

describe("create_campaign_draft", () => {
  it("queda deshabilitada si el servidor no tiene aprobaciones configuradas", async () => {
    await connect(false);
    const { isError, payload } = await session.call<ErrorOutput>("create_campaign_draft", {
      campaign: DRAFT,
      approval_token: "x",
    });
    expect(isError).toBe(true);
    expect(payload.error.code).toBe("approval_required");
    expect(createCalls()).toBe(0);
  });

  it("rechaza un token inventado sin crear nada", async () => {
    await connect();
    const { payload } = await session.call<ErrorOutput>("create_campaign_draft", {
      campaign: DRAFT,
      approval_token: "abc.def",
    });
    expect(payload.error.code).toBe("approval_invalid");
    expect(createCalls()).toBe(0);
  });

  it("rechaza el token si el modelo cambió el mensaje aprobado", async () => {
    await connect();
    const token = await approve("create", createApprovalContent(DRAFT));
    const altered = { ...DRAFT, message: `${DRAFT.message} ¡Te esperamos!` };
    const { payload } = await session.call<ErrorOutput>("create_campaign_draft", {
      campaign: altered,
      approval_token: token,
    });
    expect(payload.error.message).toContain("contenido cambió");
    expect(createCalls()).toBe(0);
  });

  it("valida la vigencia antes de consumir el token", async () => {
    await connect();
    const early = { ...DRAFT, offer: { ...DRAFT.offer, valid_from: "2026-10-31" } };
    const token = await approve("create", createApprovalContent(early));
    const { payload } = await session.call<ErrorOutput>("create_campaign_draft", {
      campaign: early,
      approval_token: token,
    });
    expect(payload.error.code).toBe("validation_error");
    expect(payload.error.message).toContain("después de la fecha de corte");
    // ES: El token sigue vigente: verificarlo ahora con su contenido original debe funcionar.
    // EN: The token is still unused: verifying it now with its original content must succeed.
    await expect(
      verifyApprovalToken(
        { action: "create", businessId: BUSINESS_ID, content: createApprovalContent(early), token },
        { secret: SECRET, store, now: () => TEST_NOW },
      ),
    ).resolves.toBeUndefined();
  });

  it("rechaza un mensaje de push que excede 140 caracteres", async () => {
    await connect();
    const long = { ...DRAFT, channel: "push" as const, message: "x".repeat(141) };
    const token = await approve("create", createApprovalContent(long));
    const { payload } = await session.call<ErrorOutput>("create_campaign_draft", {
      campaign: long,
      approval_token: token,
    });
    expect(payload.error.message).toContain("límite de push es 140");
  });

  it("crea el borrador una sola vez con un token válido para el contenido exacto", async () => {
    await connect();
    const token = await approve("create", createApprovalContent(DRAFT));
    const { isError, payload } = await session.call<CreateOutput>("create_campaign_draft", {
      campaign: DRAFT,
      approval_token: token,
    });
    expect(isError).toBe(false);
    expect(payload.data).toMatchObject({ campaign_id: "cmp_test01", status: "draft" });
    expect(payload.data.reach.reachable).toBe(267);
    expect(createCalls()).toBe(1);
  });
});

describe("send_campaign", () => {
  it("envía el borrador y confirma el estado releyendo la campaña, sin depender de la respuesta de /send", async () => {
    await connect();
    const token = await approve(
      "send",
      sendApprovalContentFromDraft("cmp_test01", DRAFT),
      "cmp_test01",
    );
    const { isError, payload } = await session.call<SendOutput>("send_campaign", {
      campaign_id: "cmp_test01",
      approval_token: token,
    });
    expect(isError).toBe(false);
    expect(payload.data).toMatchObject({ status: "sent", audience_size: 267 });
  });

  it("responde conflict si la campaña ya se envió", async () => {
    await connect();
    const token = await approve(
      "send",
      sendApprovalContent({ ...STORED_DRAFT, id: "cmp_sent" }),
      "cmp_sent",
    );
    const { payload } = await session.call<ErrorOutput>("send_campaign", {
      campaign_id: "cmp_sent",
      approval_token: token,
    });
    expect(payload.error.code).toBe("conflict");
  });

  it("reporta si la API acepta el envío pero la campaña no queda enviada, y no permite reutilizar el token", async () => {
    await connect();
    const stuck = { ...STORED_DRAFT, id: "cmp_stuck" };
    const token = await approve("send", sendApprovalContent(stuck), "cmp_stuck");
    const first = await session.call<ErrorOutput>("send_campaign", {
      campaign_id: "cmp_stuck",
      approval_token: token,
    });
    expect(first.payload.error.code).toBe("upstream_error");
    expect(first.payload.error.message).toContain("aparece en estado draft");
    const second = await session.call<ErrorOutput>("send_campaign", {
      campaign_id: "cmp_stuck",
      approval_token: token,
    });
    expect(second.payload.error.code).toBe("approval_invalid");
  });
});
