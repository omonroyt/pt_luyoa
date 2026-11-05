/**
 * ES: Prueba de compatibilidad de modelos (ELECCION_DE_MODELO §10). Ejecuta la misma
 *     pregunta con cada candidato a través del stack real del agente (OpenRouter, AI SDK y
 *     cliente MCP contra /api/mcp) usando solo herramientas de lectura sobre la API real.
 *     Mide pasos, herramientas, errores de argumentos, latencia, razonamiento y costo, y
 *     guarda el reporte en evals/reports/.
 *     Uso (desde apps/web): tsx --env-file=../../.env scripts/check-model-compat.ts
 * EN: Model compatibility check (ELECCION_DE_MODELO §10). Runs the same question with each
 *     candidate through the real agent stack (OpenRouter, AI SDK and MCP client against
 *     /api/mcp) using only read tools over the real API. Measures steps, tools, argument
 *     errors, latency, reasoning and cost, and stores the report in evals/reports/.
 *     Usage (from apps/web): tsx --env-file=../../.env scripts/check-model-compat.ts
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { createServerFactory } from "@alborada/mcp-server";
import { isStepCount, streamText, tool, type StepResult, type ToolSet } from "ai";
import { z } from "zod";
import { agentConfig } from "../lib/agent/agent-config";
import { connectMcpClient } from "../lib/agent/mcp-tools";
import { createAgentModel } from "../lib/agent/model";
import { findRepoRoot, serverConfig } from "../lib/server-config";

const CANDIDATES = [
  "z-ai/glm-5.3-flash",
  "deepseek/deepseek-v4.1-flash-1017",
  "anthropic/claude-haiku-5.5",
  "openai/gpt-6.1-terra",
  "google/gemini-4-argon",
];
const WRITE_TOOLS = new Set(["create_campaign_draft", "send_campaign"]);
const BUDGET_USD = 0.3;
const QUESTION =
  "¿Cuántos clientes estoy perdiendo y a cuántos de ellos puedo contactar por WhatsApp?";
const INSTRUCTIONS = [
  "Eres el copiloto de negocio de Café Alborada. Respondes en español de México, breve y claro.",
  "Solo afirmas cifras que vengan del resultado de una herramienta; no calculas tú.",
  "El alcance de un canal es el valor reachable, no el tamaño del segmento.",
  "Antes de tu respuesta final, llama show_kpis con 2 a 4 cifras clave y los source.id de",
  "los resultados que las respaldan.",
].join("\n");

const KpisInput = z.object({
  title: z.string(),
  period: z.object({ from: z.string(), to: z.string() }),
  items: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
        unit: z.enum(["count", "mxn", "percent"]),
      }),
    )
    .min(2)
    .max(4),
  sources: z.array(z.string()).min(1),
});

const showKpis = tool({
  description: "Muestra de 2 a 4 cifras clave con su periodo y sus fuentes.",
  inputSchema: KpisInput,
  execute: async () => ({ shown: true }),
});

type CompatResult = {
  model: string;
  ok: boolean;
  steps: number;
  tools: string[];
  invalidToolCalls: number;
  kpis: { valid: boolean; sourcesFound: boolean; valuesFound: boolean } | null;
  firstTextMs: number | null;
  totalMs: number;
  reasoningTokens: number;
  inputTokens: number;
  cachedTokens: number;
  costUsd: number;
  answer: string;
  error?: string;
};

function stepCost(step: StepResult<ToolSet>): number {
  const usage = (step.providerMetadata?.openrouter as { usage?: { cost?: number } } | undefined)
    ?.usage;
  return usage?.cost ?? 0;
}

function checkKpis(steps: StepResult<ToolSet>[]): CompatResult["kpis"] {
  const calls = steps.flatMap((step) => step.toolCalls);
  const kpisCall = calls.find((call) => call.toolName === "show_kpis");
  if (!kpisCall) return null;
  const evidence = JSON.stringify(
    steps.flatMap((step) => step.toolResults.filter((r) => r.toolName !== "show_kpis")),
  );
  const parsed = KpisInput.safeParse(kpisCall.input);
  if (!parsed.success) return { valid: false, sourcesFound: false, valuesFound: false };
  const sourcesFound = parsed.data.sources.every((id) => evidence.includes(id));
  const valuesFound = parsed.data.items.every((item) => evidence.includes(String(item.value)));
  return { valid: true, sourcesFound, valuesFound };
}

function summarize(
  model: string,
  steps: StepResult<ToolSet>[],
  timing: { first: number | null; total: number },
): CompatResult {
  const tools = steps.flatMap((step) => step.toolCalls.map((call) => call.toolName));
  const invalidToolCalls = steps
    .flatMap((step) => step.content)
    .filter((part) => part.type === "tool-error").length;
  const kpis = checkKpis(steps);
  const sum = (pick: (s: StepResult<ToolSet>) => number | undefined) =>
    steps.reduce((total, step) => total + (pick(step) ?? 0), 0);
  return {
    model,
    ok: tools.length >= 2 && kpis?.valid === true,
    steps: steps.length,
    tools,
    invalidToolCalls,
    kpis,
    firstTextMs: timing.first,
    totalMs: timing.total,
    reasoningTokens: sum((s) => s.usage.outputTokenDetails.reasoningTokens),
    inputTokens: sum((s) => s.usage.inputTokens),
    cachedTokens: sum((s) => s.usage.inputTokenDetails.cacheReadTokens),
    costUsd: sum(stepCost),
    answer: steps.at(-1)?.text.slice(0, 400) ?? "",
  };
}

async function runCandidate(model: string, tools: ToolSet, apiKey: string): Promise<CompatResult> {
  const started = Date.now();
  let first: number | null = null;
  try {
    const result = streamText({
      model: createAgentModel({ apiKey, modelId: model }),
      instructions: INSTRUCTIONS,
      prompt: QUESTION,
      tools: { ...tools, show_kpis: showKpis },
      stopWhen: isStepCount(8),
    });
    for await (const chunk of result.textStream) {
      if (first === null && chunk.length > 0) first = Date.now() - started;
    }
    return summarize(model, await result.steps, { first, total: Date.now() - started });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ...summarize(model, [], { first, total: Date.now() - started }),
      ok: false,
      error: message.slice(0, 300),
    };
  }
}

function readOnly(tools: ToolSet): ToolSet {
  return Object.fromEntries(Object.entries(tools).filter(([name]) => !WRITE_TOOLS.has(name)));
}

async function main(): Promise<void> {
  const config = serverConfig();
  const [business] = config.businesses;
  if (!business) throw new Error("No hay negocios registrados.");
  const { openRouterApiKey } = agentConfig();
  const createServer = createServerFactory({
    apiKey: business.apiKey,
    apiBaseUrl: config.apiBaseUrl,
    businessId: business.id,
  });
  const client = await connectMcpClient({ serviceToken: business.mcpServiceToken, createServer });
  const results: CompatResult[] = [];
  try {
    const tools = readOnly(await client.tools());
    for (const model of CANDIDATES) {
      const spent = results.reduce((total, r) => total + r.costUsd, 0);
      if (spent > BUDGET_USD) break;
      console.log(`→ ${model}`);
      const result = await runCandidate(model, tools, openRouterApiKey);
      results.push(result);
      console.log(JSON.stringify({ ...result, answer: undefined }));
    }
  } finally {
    await client.close();
  }
  const file = path.join(findRepoRoot(), "evals", "reports", "2026-11-04-compat.json");
  writeFileSync(file, `${JSON.stringify({ question: QUESTION, results }, null, 2)}\n`);
  console.log(`Reporte: ${file}`);
}

await main();
