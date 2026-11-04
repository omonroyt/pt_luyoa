/**
 * ES: Tokens de aprobación (ADR-08): un paquete firmado con HMAC-SHA256 que liga una
 *     acción (crear o enviar), un negocio, una campaña y el hash exacto del contenido
 *     aprobado por la persona. El modelo no conoce la llave, así que no puede fabricarlo.
 * EN: Approval tokens (ADR-08): an HMAC-SHA256 signed payload that binds an action
 *     (create or send), a business, a campaign and the exact hash of the content the
 *     person approved. The model does not know the key, so it cannot forge one.
 */
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { ToolFailure } from "../errors";
import type { ApprovalAction, ApprovalRecord, ApprovalStore } from "./approval-store";
import { contentHash } from "./content-hash";

export const APPROVAL_TTL_MS = 10 * 60 * 1000;

type TokenPayload = {
  aid: string;
  act: ApprovalAction;
  biz: string;
  h: string;
  exp: number;
  cid?: string;
};

export type IssueRequest = {
  action: ApprovalAction;
  businessId: string;
  content: unknown;
  campaignId?: string;
};

export type VerifyRequest = IssueRequest & { token: string };

const sign = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url");

function invalid(message: string): ToolFailure {
  return new ToolFailure({
    code: "approval_invalid",
    message,
    suggestion: "Mostrar de nuevo la propuesta y pedir aprobación a la persona.",
  });
}

/**
 * ES: Emite un token de aprobación y registra la aprobación en el almacén.
 * EN: Issues an approval token and records the approval in the store.
 */
export async function issueApprovalToken(
  request: IssueRequest,
  options: { secret: string; store: ApprovalStore; now?: () => Date },
): Promise<{ token: string; record: ApprovalRecord }> {
  const now = options.now ?? (() => new Date());
  const record: ApprovalRecord = {
    id: randomUUID(),
    action: request.action,
    businessId: request.businessId,
    contentHash: contentHash(request.content),
    campaignId: request.campaignId,
    expiresAt: new Date(now().getTime() + APPROVAL_TTL_MS),
  };
  const payload: TokenPayload = {
    aid: record.id,
    act: record.action,
    biz: record.businessId,
    h: record.contentHash,
    exp: record.expiresAt.getTime(),
    ...(record.campaignId ? { cid: record.campaignId } : {}),
  };
  await options.store.save(record);
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${encoded}.${sign(encoded, options.secret)}`, record };
}

function readPayload(token: string, secret: string): TokenPayload {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) throw invalid("El token de aprobación no tiene el formato esperado.");
  const expected = Buffer.from(sign(encoded, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw invalid("La firma del token de aprobación no es válida.");
  }
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TokenPayload;
}

/**
 * ES: Verifica el token contra la acción y el contenido que se van a ejecutar, y lo
 *     consume para que no pueda reutilizarse.
 * EN: Verifies the token against the action and content about to be executed, and
 *     consumes it so it cannot be reused.
 */
export async function verifyApprovalToken(
  request: VerifyRequest,
  options: { secret: string; store: ApprovalStore; now?: () => Date },
): Promise<void> {
  const payload = readPayload(request.token, options.secret);
  const now = (options.now ?? (() => new Date()))().getTime();
  if (payload.exp < now) throw invalid("La aprobación expiró.");
  if (payload.act !== request.action) throw invalid("La aprobación es para otra acción.");
  if (payload.biz !== request.businessId) throw invalid("La aprobación es de otro negocio.");
  if ((payload.cid ?? null) !== (request.campaignId ?? null)) {
    throw invalid("La aprobación es para otra campaña.");
  }
  if (payload.h !== contentHash(request.content)) {
    throw invalid("El contenido cambió después de la aprobación.");
  }
  if (!(await options.store.consume(payload.aid))) {
    throw invalid("La aprobación ya se usó o no existe.");
  }
}
