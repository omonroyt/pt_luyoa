/**
 * ES: Lecturas y escrituras de uso de la demo: un contador que se incrementa de forma
 *     atómica (INSERT … ON CONFLICT … RETURNING, una sola sentencia) y el gasto registrado
 *     en las trazas desde una fecha.
 * EN: Demo usage reads and writes: a counter incremented atomically (INSERT … ON CONFLICT …
 *     RETURNING, a single statement) and the spend recorded in the traces since a date.
 */
import { gte, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { traceSteps, usageCounters } from "../db/schema";

export async function incrementCounter(db: Database, key: string, now: Date): Promise<number> {
  const [row] = await db
    .insert(usageCounters)
    .values({ key, count: 1, updatedAt: now })
    .onConflictDoUpdate({
      target: usageCounters.key,
      set: { count: sql`${usageCounters.count} + 1`, updatedAt: now },
    })
    .returning({ count: usageCounters.count });
  return row?.count ?? 1;
}

export async function spentSince(db: Database, since: Date): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${traceSteps.costUsd}), 0)` })
    .from(traceSteps)
    .where(gte(traceSteps.createdAt, since));
  return Number(row?.total ?? 0);
}
