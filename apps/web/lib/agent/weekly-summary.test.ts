import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type Database } from "../db/client";
import {
  cardSteps,
  fixtureCampaignCard,
  fixtureMcpConnection,
  scriptedModel,
  type ScriptedReply,
} from "./test-support";
import { WEEKLY_SUMMARY_PROMPT } from "./weekly-prompt";
import { generateWeeklySummary } from "./weekly-summary";
import { latestWeeklySummary, saveWeeklySummary } from "./weekly-summary-store";

const summaryWith = (replies: ScriptedReply[]) =>
  generateWeeklySummary({
    model: scriptedModel((_hasTools, call) => replies[call] ?? { text: "" }),
    mcp: fixtureMcpConnection(),
  });

describe("resumen semanal (X-02)", () => {
  it("corre el turno del agente y guarda la pregunta y la respuesta con su semana", async () => {
    const summary = await summaryWith([{ text: "Semana del 25 al 31 de octubre: 1. …" }]);
    expect(summary.weekEnd).toBe("2026-10-31");
    expect(summary.messages.map((message) => message.role)).toEqual(["user", "assistant"]);
    expect(JSON.stringify(summary.messages[0])).toContain(WEEKLY_SUMMARY_PROMPT);
  });

  it("no guarda un resumen sin texto", async () => {
    await expect(summaryWith([{ text: "  " }])).rejects.toThrow("con texto");
  });

  it("no guarda un resumen que pidió una aprobación", async () => {
    const campaign = {
      name: "Te extrañamos",
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
    const steps = [
      ...cardSteps(await fixtureCampaignCard()),
      { toolName: "request_draft_approval", input: { campaign } },
    ];
    await expect(summaryWith(steps)).rejects.toThrow("aprobación");
  });
});

const summary = (weekEnd: string): { weekEnd: string; messages: UIMessage[] } => ({
  weekEnd,
  messages: [{ id: "u", role: "user", parts: [{ type: "text", text: WEEKLY_SUMMARY_PROMPT }] }],
});
const pause = () => new Promise((resolve) => setTimeout(resolve, 5));

describe("resúmenes guardados", () => {
  let db: Database;
  beforeEach(async () => {
    db = await openDatabase({ url: ":memory:" });
  });

  it("entrega el más reciente de cada negocio, sin mezclar negocios (CA-X05)", async () => {
    await saveWeeklySummary(db, "biz_a", summary("2026-10-24"));
    await pause();
    await saveWeeklySummary(db, "biz_a", summary("2026-10-31"));
    await saveWeeklySummary(db, "biz_b", summary("2026-10-17"));
    expect((await latestWeeklySummary(db, "biz_a"))?.weekEnd).toBe("2026-10-31");
    expect((await latestWeeklySummary(db, "biz_b"))?.weekEnd).toBe("2026-10-17");
    expect(await latestWeeklySummary(db, "biz_c")).toBeUndefined();
  });
});
