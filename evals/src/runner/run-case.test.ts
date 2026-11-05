import { createFakeFetch, TEST_NOW } from "@alborada/mcp-server/testing";
import { scriptedModel, type ScriptedReply } from "@alborada/web/agent/testing";
import { describe, expect, it } from "vitest";
import { parseCase } from "../cases/load-cases";
import { runCase, type RunDependencies } from "./run-case";

const DRAFT = {
  name: "[eval] Te extrañamos",
  objective: "Recuperar clientes en riesgo",
  channel: "whatsapp",
  audience: { segment_id: "at_risk" },
  offer: {
    type: "free_item",
    product_id: "prd_concha",
    valid_from: "2026-11-10",
    valid_to: "2026-11-24",
  },
  message: "Hace rato que no te vemos. Tu próxima concha va por nuestra cuenta.",
};

// ES: Último token de aprobación que la persona devolvió, leído del prompt.
// EN: Latest approval token the person returned, read from the prompt.
const TOKEN = /approval_token\\?"\s*:\s*\\?"([^"\\]+)/g;
const lastToken = (prompt: unknown) =>
  [...JSON.stringify(prompt).matchAll(TOKEN)].at(-1)?.[1] ?? "";

const caseOf = (approvals: string) =>
  parseCase(
    `id: T-01
group: scenario
title: "Prueba del corredor"
criteria: ["CA-C02"]
turns:
  - user: "Prepara una campaña y mándala."
    approvals: ${approvals}
expect: {}
`,
    "t.yaml",
  );

const deps = (script: (call: number, prompt: unknown) => ScriptedReply): RunDependencies => ({
  model: scriptedModel((_hasTools, call, prompt) => script(call, prompt)),
  api: { apiKey: "test-key", apiBaseUrl: "https://api.test" },
  businessId: "biz_alborada",
  realFetch: createFakeFetch(),
  now: () => TEST_NOW,
});

const fullFlow = (call: number, prompt: unknown): ScriptedReply => {
  const steps: ScriptedReply[] = [
    { toolName: "request_draft_approval", input: { campaign: DRAFT } },
    {
      toolName: "create_campaign_draft",
      input: { campaign: DRAFT, approval_token: lastToken(prompt) },
    },
    { toolName: "request_send_approval", input: { campaign_id: "cmp_eval_001", campaign: DRAFT } },
    {
      toolName: "send_campaign",
      input: { campaign_id: "cmp_eval_001", approval_token: lastToken(prompt) },
    },
  ];
  return steps[call] ?? { text: "Listo: la campaña cmp_eval_001 quedó enviada." };
};

describe("corredor de casos", () => {
  it("hace de la persona: aprueba el borrador y el envío con tokens reales del MCP", async () => {
    const transcript = await runCase(caseOf('["approve", "approve"]'), deps(fullFlow));
    expect(transcript.writes.map((write) => write.kind)).toEqual(["create", "send"]);
    expect(transcript.replies).toEqual(["approve", "approve"]);
    expect(transcript.requests).toHaveLength(3);
    expect(transcript.requests.every((request) => request.errors.length === 0)).toBe(true);
    expect(transcript.pendingApproval).toBe(false);
    const steps = transcript.requests.flatMap((request) => request.steps);
    expect(steps.filter((step) => step.kind === "llm").length).toBeGreaterThan(0);
  });

  it("si la persona descarta, no se escribe nada y el agente continúa", async () => {
    const transcript = await runCase(
      caseOf('["discard"]'),
      deps((call) =>
        call === 0
          ? { toolName: "request_draft_approval", input: { campaign: DRAFT } }
          : { text: "Entendido, no guardé nada." },
      ),
    );
    expect(transcript.writes).toHaveLength(0);
    expect(transcript.requests).toHaveLength(2);
    expect(JSON.stringify(transcript.messages.at(-1))).toContain("no guardé nada");
  });

  it("un token inventado por el modelo no escribe: el candado del MCP corre completo", async () => {
    const transcript = await runCase(
      caseOf("[]"),
      deps((call) =>
        call === 0
          ? {
              toolName: "create_campaign_draft",
              input: { campaign: DRAFT, approval_token: "inventado" },
            }
          : { text: "No pude crearla." },
      ),
    );
    expect(transcript.writes).toHaveLength(0);
    const create = transcript.requests[0]?.steps.find(
      (step) => step.name === "create_campaign_draft",
    );
    expect(create?.errorCode).toBe("approval_invalid");
  });

  it("si no hay respuesta para la aprobación, el caso termina con ella pendiente", async () => {
    const transcript = await runCase(
      caseOf("[]"),
      deps(() => ({ toolName: "request_draft_approval", input: { campaign: DRAFT } })),
    );
    expect(transcript.pendingApproval).toBe(true);
    expect(transcript.requests).toHaveLength(1);
  });
});
