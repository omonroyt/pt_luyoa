/**
 * ES: Almacén de aprobaciones. El MCP solo conoce esta interfaz; la aplicación aporta
 *     una implementación persistente y el CLI stdio y las pruebas usan la de memoria.
 * EN: Approval store. The MCP only knows this interface; the application provides a
 *     persistent implementation and the stdio CLI and tests use the in-memory one.
 */

export type ApprovalAction = "create" | "send";

export type ApprovalRecord = {
  id: string;
  action: ApprovalAction;
  businessId: string;
  contentHash: string;
  campaignId?: string;
  expiresAt: Date;
};

export type ApprovalStore = {
  save(record: ApprovalRecord): Promise<void>;
  /**
   * ES: Marca la aprobación como usada. Devuelve false si no existe o ya se usó.
   * EN: Marks the approval as used. Returns false if it does not exist or was used.
   */
  consume(approvalId: string): Promise<boolean>;
};

export function createMemoryApprovalStore(): ApprovalStore {
  const pending = new Map<string, ApprovalRecord>();
  return {
    async save(record) {
      pending.set(record.id, record);
    },
    async consume(approvalId) {
      return pending.delete(approvalId);
    },
  };
}
