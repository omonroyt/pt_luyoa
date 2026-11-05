/**
 * ES: API pública del agente para otras capas (evals). Expone el turno del agente con sus
 *     dependencias inyectables, el modelo de OpenRouter, la emisión de aprobaciones y las
 *     respuestas de la persona a una aprobación, las mismas que usa la interfaz, y el
 *     almacén de preferencias en memoria para los casos que necesitan memoria.
 * EN: Public agent API for other layers (evals). It exposes the agent turn with its
 *     injectable dependencies, the OpenRouter model, approval issuance and the person's
 *     answers to an approval, the same ones the UI uses, plus the in-memory preference
 *     store for cases that need memory.
 */
export { agentConfig, type AgentConfig } from "./agent-config";
export { APPROVAL_TOOLS, ApprovalOutput } from "./approval-tools";
export { createAgentModel, type ModelOptions } from "./model";
export { PRESENTATION_TOOLS } from "./presentation-tools";
export { MAX_STEPS, streamAgentTurn, type PersistTurn, type TurnDependencies } from "./run-turn";
export type { TraceKind, TraceStep, TurnTotals } from "./turn-tracer";
export { issueApproval, type ApprovalRequest } from "../approvals/issue-approval";
export { changeRequestOutput, discardOutput } from "./approval-replies";
export { createMemoryPreferenceStore, type PreferenceStore } from "../memory/preference-store";
