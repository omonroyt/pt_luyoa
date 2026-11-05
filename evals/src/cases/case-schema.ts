/**
 * ES: Formato de un caso de evaluación (08_PLAN_EVALUACION.md §3, IMP-50). Cada caso es un
 *     YAML en evals/cases/ con la conversación, cómo responde la persona a una aprobación,
 *     las fallas que se inyectan en la API y lo que se espera del agente.
 * EN: Evaluation case format (08_PLAN_EVALUACION.md §3, IMP-50). Each case is a YAML file
 *     in evals/cases/ with the conversation, how the person answers an approval, the
 *     faults injected into the API and what is expected from the agent.
 */
import { z } from "zod";

// ES: Herramientas del MCP; una prueba verifica que coinciden con las registradas.
// EN: MCP tools; a test checks they match the registered ones.
export const MCP_TOOLS = [
  "get_business_context",
  "compare_periods",
  "sales_breakdown",
  "visits_breakdown",
  "location_health",
  "customer_segments",
  "audience_reach",
  "campaign_performance",
  "offer_economics",
  "estimate_campaign_impact",
  "lookup",
  "create_campaign_draft",
  "send_campaign",
] as const;

export const BLOCKS = ["chart", "table", "kpis", "campaign_card"] as const;
export type BlockKind = (typeof BLOCKS)[number];

export const GROUPS = [
  "scenario",
  "variant",
  "example",
  "negative",
  "fault",
  "approval",
  "multiturn",
  "memory",
] as const;

const Tool = z.enum(MCP_TOOLS);
const Block = z.enum(BLOCKS);

/**
 * ES: Respuestas de la persona a las aprobaciones que el agente pida en ese turno, en
 *     orden (un mismo mensaje puede llevar a aprobar el borrador y luego el envío). Si se
 *     acaban y queda una aprobación pendiente, el siguiente turno de texto se entrega como
 *     "Cambiar" con ese texto, igual que en la interfaz; si no hay siguiente turno, el
 *     caso termina con la aprobación pendiente.
 * EN: The person's answers to the approvals the agent asks for in that turn, in order (one
 *     message can lead to approving the draft and then the send). If they run out and an
 *     approval is pending, the next text turn is delivered as "Cambiar" with that text,
 *     as in the UI; if there is no next turn, the case ends with the approval pending.
 */
const ApprovalReply = z.union([
  z.enum(["approve", "discard"]),
  z.object({ change: z.string().min(1) }),
]);
export type ApprovalReply = z.infer<typeof ApprovalReply>;

const Turn = z.object({
  user: z.string().min(1),
  approvals: z.array(ApprovalReply).default([]),
  // ES: El turno abre una conversación nueva del mismo negocio (memoria entre conversaciones).
  // EN: The turn opens a new conversation of the same business (memory across conversations).
  new_conversation: z.boolean().default(false),
});

// ES: Falla que la API responde en lugar del dato real, las primeras `times` veces.
// EN: Fault the API answers instead of the real data, the first `times` times.
const Fault = z.object({
  method: z.enum(["GET", "POST"]),
  path: z.string().regex(/^\/v1\//, "Ruta de la API, p. ej. /v1/analytics/sales"),
  status: z.union([z.literal(401), z.literal(404), z.literal(422), z.literal(429), z.literal(503)]),
  times: z.number().int().min(1).default(1),
});
export type Fault = z.infer<typeof Fault>;

const Expect = z.object({
  tools_required: z.array(Tool).default([]),
  tools_optional: z.array(Tool).default([]),
  tools_forbidden: z.array(Tool).default([]),
  blocks_required: z.array(Block).default([]),
  blocks_forbidden: z.array(Block).default([]),
  golden: z.string().optional().describe("Id del archivo en evals/golden/"),
  figures: z.array(z.string()).default([]).describe("Rutas de cifras dentro de golden.figures"),
  must_mention: z.array(z.string()).default([]).describe("Expresiones regulares, sin mayúsculas"),
  must_not_mention: z.array(z.string()).default([]),
  must_ask_approval: z.boolean().default(false),
  writes: z
    .object({ create: z.number().int().min(0), send: z.number().int().min(0) })
    .default({ create: 0, send: 0 })
    .describe("Escrituras exitosas esperadas, siempre después de una aprobación"),
  honest_refusal: z.boolean().default(false).describe("Debe decir que no tiene el dato"),
  recovery: z.boolean().default(false).describe("Debe explicar la falla y ofrecer reintentar"),
  rubric: z.array(z.string()).default([]).describe("Criterios CA- que califica el juez"),
});
export type Expect = z.infer<typeof Expect>;

// ES: Funciones de M7 que un caso puede necesitar, y las que el corredor ya soporta.
// EN: M7 features a case may need, and the ones the runner already supports.
const REQUIREMENTS = ["memory", "weekly_summary"] as const;
const SUPPORTED: ReadonlyArray<string> = ["memory", "weekly_summary"];

export const EvalCase = z
  .object({
    id: z.string().regex(/^[A-Z0-9-]+$/),
    group: z.enum(GROUPS),
    title: z.string().min(1),
    criteria: z.array(z.string()).min(1),
    requires: z.array(z.enum(REQUIREMENTS)).default([]),
    turns: z.array(Turn).min(1),
    faults: z.array(Fault).default([]),
    expect: Expect,
  })
  .superRefine((value, ctx) => {
    if (value.expect.figures.length > 0 && !value.expect.golden) {
      ctx.addIssue({ code: "custom", message: "figures requiere golden", path: ["expect"] });
    }
    const writes = value.expect.writes.create + value.expect.writes.send;
    const approvals = value.turns
      .flatMap((turn) => turn.approvals)
      .filter((reply) => reply === "approve").length;
    if (writes > approvals) {
      ctx.addIssue({
        code: "custom",
        message: "Cada escritura esperada necesita un turno que la apruebe",
        path: ["expect", "writes"],
      });
    }
  });
export type EvalCase = z.infer<typeof EvalCase>;

export const missingRequirements = (evalCase: Pick<EvalCase, "requires">): string[] =>
  evalCase.requires.filter((requirement) => !SUPPORTED.includes(requirement));
