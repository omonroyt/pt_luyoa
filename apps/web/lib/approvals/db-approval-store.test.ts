import {
  createApprovalContent,
  issueApprovalToken,
  type ApprovalRecord,
  type CampaignDraft,
} from "@alborada/mcp-server";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type Database } from "../db/client";
import { createDatabaseApprovalStore } from "./db-approval-store";

const NOW = new Date("2026-11-04T12:00:00Z");

const record = (overrides: Partial<ApprovalRecord> = {}): ApprovalRecord => ({
  id: "apr_1",
  action: "create",
  businessId: "biz_alborada",
  contentHash: "hash",
  expiresAt: new Date(NOW.getTime() + 60_000),
  ...overrides,
});

let db: Database;

beforeEach(async () => {
  db = await openDatabase({ url: ":memory:" });
});

describe("createDatabaseApprovalStore", () => {
  it("permite usar una aprobación una sola vez", async () => {
    const store = createDatabaseApprovalStore(db, () => NOW);
    await store.save(record());
    expect(await store.consume("apr_1")).toBe(true);
    expect(await store.consume("apr_1")).toBe(false);
  });

  it("rechaza una aprobación vencida o inexistente", async () => {
    const store = createDatabaseApprovalStore(db, () => NOW);
    await store.save(record({ expiresAt: new Date(NOW.getTime() - 1) }));
    expect(await store.consume("apr_1")).toBe(false);
    expect(await store.consume("apr_no_existe")).toBe(false);
  });

  it("garantiza que solo una de dos solicitudes simultáneas consuma el token", async () => {
    const store = createDatabaseApprovalStore(db, () => NOW);
    await store.save(record());
    const results = await Promise.all([store.consume("apr_1"), store.consume("apr_1")]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("funciona con los tokens del servidor MCP de punta a punta", async () => {
    const store = createDatabaseApprovalStore(db, () => NOW);
    const draft: CampaignDraft = {
      name: "Prueba",
      objective: "Recuperar clientes",
      channel: "email",
      audience: { segment_id: "at_risk" },
      offer: { type: "percent_off", value: 10, valid_from: "2026-11-10", valid_to: "2026-11-20" },
      message: "Hola",
    };
    const { record: issued } = await issueApprovalToken(
      { action: "create", businessId: "biz_alborada", content: createApprovalContent(draft) },
      { secret: "x".repeat(32), store, now: () => NOW },
    );
    expect(await store.consume(issued.id)).toBe(true);
    expect(await store.consume(issued.id)).toBe(false);
  });
});
