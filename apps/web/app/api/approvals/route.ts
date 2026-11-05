/**
 * ES: Emite el token de aprobación cuando la persona aprueba una campaña en la interfaz.
 *     Solo acepta solicitudes del mismo origen.
 * EN: Issues the approval token when the person approves a campaign in the UI. It only
 *     accepts same-origin requests.
 */
import { isSameOrigin } from "@/lib/auth/service-token";
import { ApprovalRequest, issueApproval } from "@/lib/approvals/issue-approval";
import { approvalStore } from "@/lib/mcp/runtime";
import { serverConfig } from "@/lib/server-config";
import { currentBusiness, sessionRequiredResponse } from "@/lib/tenancy/current-business";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Response.json(
      { error: { code: "forbidden", message: "Origen no permitido." } },
      { status: 403 },
    );
  }
  const parsed = ApprovalRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    return Response.json({ error: { code: "validation_error", message } }, { status: 400 });
  }
  const business = currentBusiness(request);
  if (!business) return sessionRequiredResponse();
  const config = serverConfig();
  const approval = await issueApproval(parsed.data, {
    secret: config.approvalSecret,
    store: approvalStore,
    businessId: business.id,
  });
  return Response.json(approval, { status: 201 });
}
