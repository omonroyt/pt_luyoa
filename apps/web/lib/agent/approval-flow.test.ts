import {
  createApprovalContent,
  createMemoryApprovalStore,
  issueApprovalToken,
  type CampaignDraft,
} from "@alborada/mcp-server";
import { createFixtureServerFactory, fixtureKey, TEST_NOW } from "@alborada/mcp-server/testing";
import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { parseChatRequest } from "./chat-request";
import { streamAgentTurn } from "./run-turn";
import { cardSteps, fixtureCampaignCard, scriptedModel, TEST_SERVICE_TOKEN } from "./test-support";
import { EARLY_STEP_MESSAGE } from "./ui-errors";

const SECRET = "secreto-de-prueba";

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

const CREATE_KEY = fixtureKey(
  "POST",
  new URL("https://api.test/v1/campaigns"),
  JSON.stringify(createApprovalContent(DRAFT)),
);

function approvalsSetup() {
  const store = createMemoryApprovalStore();
  const createServer = createFixtureServerFactory(
    { [CREATE_KEY]: { status: 201, body: { id: "cmp_test01", status: "draft" } } },
    { secret: SECRET, store },
  );
  const approve = async (content: CampaignDraft) =>
    (
      await issueApprovalToken(
        { action: "create", businessId: "biz_alborada", content: createApprovalContent(content) },
        { secret: SECRET, store, now: () => TEST_NOW },
      )
    ).token;
  return { mcp: { serviceToken: TEST_SERVICE_TOKEN, createServer }, approve };
}

const ASK: UIMessage = {
  id: "u1",
  role: "user",
  parts: [{ type: "text", text: "Prepara la campaña de recuperación y mándala" }],
};

const approvedBy = (token: string): UIMessage[] => [
  ASK,
  {
    id: "a1",
    role: "assistant",
    parts: [
      {
        type: "tool-request_draft_approval",
        toolCallId: "call_approval",
        state: "output-available",
        input: { campaign: DRAFT },
        output: {
          approved: true,
          approval_token: token,
          approval_id: "apr_1",
          expires_at: "2026-11-04T12:10:00Z",
        },
      },
    ],
  },
];

const createWith = (campaign: CampaignDraft, token: string) => ({
  toolName: "create_campaign_draft",
  input: { campaign, approval_token: token },
});

describe("flujo de aprobación del agente (ADR-08)", () => {
  it("al pedir aprobación el turno se detiene: nada se ejecuta sin la persona", async () => {
    const { mcp } = approvalsSetup();
    const steps = cardSteps(await fixtureCampaignCard());
    const model = scriptedModel(
      (_hasTools, call) =>
        steps[call] ?? { toolName: "request_draft_approval", input: { campaign: DRAFT } },
    );
    const body = await (await streamAgentTurn([ASK], { model, mcp })).text();
    expect(model.doStreamCalls).toHaveLength(steps.length + 1);
    expect(body).toContain('"toolName":"request_draft_approval"');
    expect(body).not.toContain("create_campaign_draft");
    // ES: La tarjeta pasó el verificador y la aprobación se llamó cuando estaba disponible.
    // EN: The card passed the verifier and approval was called while it was available.
    expect(body).not.toContain("tool-output-error");
    expect(body).not.toContain("tool-input-error");
    expect(body).not.toMatch(/"type":"error"/);
  });

  it("una aprobación pedida junto con una tarjeta válida sigue hacia la persona", async () => {
    const { mcp } = approvalsSetup();
    const [reach, economics, show] = cardSteps(await fixtureCampaignCard());
    const ask = { toolName: "request_draft_approval", input: { campaign: DRAFT } };
    const script = [reach!, economics!, { calls: [show as typeof ask, ask] }];
    const model = scriptedModel((_hasTools, call) => script[call] ?? { text: "No debía seguir." });
    const body = await (await streamAgentTurn([ASK], { model, mcp })).text();
    expect(model.doStreamCalls).toHaveLength(script.length);
    expect(body).toContain('"toolName":"request_draft_approval"');
    expect(body).not.toContain(EARLY_STEP_MESSAGE);
    expect(body).not.toContain("tool-output-error");
  });

  it("la aprobación de envío pedida junto con la tarjeta del borrador sigue hacia la persona", async () => {
    const { mcp, approve } = approvalsSetup();
    const token = await approve(DRAFT);
    const card = await fixtureCampaignCard();
    const [reach, economics] = cardSteps(card);
    const send = {
      toolName: "request_send_approval",
      input: { campaign_id: "cmp_test01", campaign: DRAFT },
    };
    const model = scriptedModel((_hasTools, call, prompt) => {
      const created = [...JSON.stringify(prompt).matchAll(/src_[0-9a-f]{10}/g)].at(-1)?.[0];
      const draftCard = {
        ...card,
        state: "draft",
        campaignId: "cmp_test01",
        sources: [...card.sources, created],
      };
      const script = [
        reach!,
        economics!,
        createWith(DRAFT, token),
        { calls: [{ toolName: "show_campaign_card", input: draftCard }, send] },
      ];
      return script[call] ?? { text: "No debía seguir." };
    });
    const body = await (await streamAgentTurn([ASK], { model, mcp })).text();
    expect(body).not.toContain(EARLY_STEP_MESSAGE);
    expect(body).not.toContain("tool-output-error");
    expect(model.doStreamCalls).toHaveLength(4);
  });

  it("una aprobación pedida junto con una tarjeta rechazada no llega a la persona", async () => {
    const { mcp } = approvalsSetup();
    const card = await fixtureCampaignCard();
    const [reach, economics, show] = cardSteps(card);
    const wrong = { ...card, reach: { ...card.reach, reachable: card.reach.reachable + 1 } };
    const ask = { toolName: "request_draft_approval", input: { campaign: DRAFT } };
    const script = [
      reach!,
      economics!,
      { calls: [{ toolName: "show_campaign_card", input: wrong }, ask] },
      show!,
    ];
    const model = scriptedModel((_hasTools, call) => script[call] ?? ask);
    const body = await (await streamAgentTurn([ASK], { model, mcp })).text();
    const calls = model.doStreamCalls;
    // ES: El modelo recibe la instrucción de la compuerta, no "herramienta no disponible".
    // EN: The model receives the gate's instruction, not "tool not available".
    expect(JSON.stringify(calls[3]?.prompt)).toContain("La herramienta sí está disponible");
    expect(calls).toHaveLength(script.length + 1);
    expect(calls.at(-1)?.tools?.map((tool) => tool.name)).toEqual(["request_draft_approval"]);
    expect(body).toContain(EARLY_STEP_MESSAGE);
    expect(body).not.toMatch(/"type":"error"/);
  });

  it("con el token que emitió la aprobación, el MCP crea el borrador", async () => {
    const { mcp, approve } = approvalsSetup();
    const token = await approve(DRAFT);
    const model = scriptedModel((_hasTools, call) =>
      call === 0 ? createWith(DRAFT, token) : { text: "Listo, borrador creado." },
    );
    const body = await (await streamAgentTurn(approvedBy(token), { model, mcp })).text();
    expect(body).toContain("cmp_test01");
  });

  it("una escritura con un token inventado no llega a la API", async () => {
    const { mcp } = approvalsSetup();
    const model = scriptedModel((_hasTools, call) =>
      call === 0 ? createWith(DRAFT, "inventado.firma") : { text: "No se pudo." },
    );
    const body = await (await streamAgentTurn([ASK], { model, mcp })).text();
    expect(body).toContain("approval_invalid");
    expect(body).not.toContain("cmp_test01");
  });

  it("si el modelo cambia el contenido aprobado, el token deja de servir", async () => {
    const { mcp, approve } = approvalsSetup();
    const token = await approve(DRAFT);
    const altered = { ...DRAFT, message: `${DRAFT.message} ¡Y 50% en todo!` };
    const model = scriptedModel((_hasTools, call) =>
      call === 0 ? createWith(altered, token) : { text: "No se pudo." },
    );
    const body = await (await streamAgentTurn(approvedBy(token), { model, mcp })).text();
    expect(body).toContain("contenido cambió");
    expect(body).not.toContain("cmp_test01");
  });
});

describe("parseChatRequest", () => {
  it("acepta un resultado de aprobación con la forma esperada", async () => {
    expect((await parseChatRequest({ messages: approvedBy("abc.def") })).ok).toBe(true);
  });

  it("rechaza un resultado de aprobación sin token", async () => {
    const [ask, answer] = approvedBy("abc.def");
    const part = answer!.parts[0] as { output: object };
    part.output = { approved: true };
    expect((await parseChatRequest({ messages: [ask, answer] })).ok).toBe(false);
  });

  it("usa el id de conversación de useChat y genera uno si falta", async () => {
    const withId = await parseChatRequest({ id: "chat_123", messages: [ASK] });
    const withoutId = await parseChatRequest({ messages: [ASK] });
    expect(withId).toMatchObject({ ok: true, conversationId: "chat_123" });
    expect(withoutId.ok && withoutId.conversationId.length > 0).toBe(true);
  });

  it("rechaza un id de conversación con caracteres no permitidos", async () => {
    expect((await parseChatRequest({ id: "../otro", messages: [ASK] })).ok).toBe(false);
  });
});
