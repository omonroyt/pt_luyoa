/**
 * ES: Resúmenes semanales guardados (X-02), uno por corrida del cron, siempre filtrados por
 *     negocio (ADR-16, CA-X05). La interfaz muestra el más reciente. Los tokens de
 *     aprobación nunca llegan aquí: un resumen con aprobación no se guarda.
 * EN: Stored weekly summaries (X-02), one per cron run, always filtered by business
 *     (ADR-16, CA-X05). The UI shows the most recent one. Approval tokens never get here: a
 *     summary with an approval is not stored.
 */
import { randomUUID } from "node:crypto";
import type { UIMessage } from "ai";
import { desc, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { weeklySummaries } from "../db/schema";
import type { WeeklySummary } from "./weekly-summary";

export type StoredWeeklySummary = WeeklySummary & { id: string; createdAt: Date };

export async function saveWeeklySummary(
  db: Database,
  businessId: string,
  summary: WeeklySummary,
): Promise<string> {
  const id = randomUUID();
  await db.insert(weeklySummaries).values({
    id,
    businessId,
    weekEnd: summary.weekEnd,
    content: summary.messages,
  });
  return id;
}

export async function latestWeeklySummary(
  db: Database,
  businessId: string,
): Promise<StoredWeeklySummary | undefined> {
  const [row] = await db
    .select()
    .from(weeklySummaries)
    .where(eq(weeklySummaries.businessId, businessId))
    .orderBy(desc(weeklySummaries.createdAt))
    .limit(1);
  if (!row) return undefined;
  return {
    id: row.id,
    weekEnd: row.weekEnd,
    messages: row.content as UIMessage[],
    createdAt: row.createdAt,
  };
}
