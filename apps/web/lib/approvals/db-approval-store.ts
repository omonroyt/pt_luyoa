/**
 * ES: Almacén persistente de aprobaciones. El uso único se garantiza en la base de datos:
 *     un solo UPDATE condicional marca la aprobación como usada solo si sigue aprobada
 *     y vigente, así dos solicitudes simultáneas no pueden usar el mismo token.
 * EN: Persistent approval store. Single use is guaranteed by the database: a single
 *     conditional UPDATE marks the approval as used only if it is still approved and
 *     valid, so two simultaneous requests cannot use the same token.
 */
import type { ApprovalStore } from "@alborada/mcp-server";
import { and, eq, gt } from "drizzle-orm";
import type { Database } from "../db/client";
import { approvals } from "../db/schema";

export function createDatabaseApprovalStore(
  db: Database,
  now: () => Date = () => new Date(),
): ApprovalStore {
  return {
    async save(record) {
      await db.insert(approvals).values({
        id: record.id,
        businessId: record.businessId,
        action: record.action,
        contentHash: record.contentHash,
        campaignId: record.campaignId ?? null,
        status: "approved",
        expiresAt: record.expiresAt,
      });
    },
    async consume(approvalId) {
      const moment = now();
      const result = await db
        .update(approvals)
        .set({ status: "used", usedAt: moment })
        .where(
          and(
            eq(approvals.id, approvalId),
            eq(approvals.status, "approved"),
            gt(approvals.expiresAt, moment),
          ),
        );
      return result.rowsAffected === 1;
    },
  };
}
