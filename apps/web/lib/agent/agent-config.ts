/**
 * ES: Configuración del agente (OpenRouter), separada de serverConfig para que /api/mcp y
 *     /api/approvals no dependan de la llave del modelo. Solo se usa en el servidor.
 * EN: Agent configuration (OpenRouter), kept apart from serverConfig so /api/mcp and
 *     /api/approvals do not depend on the model key. Server-side only.
 */
import { z } from "zod";

const AgentEnv = z.object({
  OPENROUTER_API_KEY: z.string().min(1, "Falta OPENROUTER_API_KEY"),
  OPENROUTER_MODEL: z.string().min(1, "Falta OPENROUTER_MODEL"),
});

export type AgentConfig = {
  openRouterApiKey: string;
  modelId: string;
};

export function agentConfig(env: NodeJS.ProcessEnv = process.env): AgentConfig {
  const parsed = AgentEnv.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Configuración del agente inválida: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
    );
  }
  return {
    openRouterApiKey: parsed.data.OPENROUTER_API_KEY,
    modelId: parsed.data.OPENROUTER_MODEL,
  };
}
