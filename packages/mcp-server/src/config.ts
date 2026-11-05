import { z } from "zod";

const ConfigSchema = z.object({
  LUYOA_API_KEY: z.string().min(1, "Falta LUYOA_API_KEY en el archivo .env"),
  LUYOA_API_BASE_URL: z.string().url().default("https://prueba-developer.luyoa.dev"),
});

export type McpConfig = {
  apiKey: string;
  apiBaseUrl: string;
  // ES: Negocio que debe responder la llave (X-05); sin él, el servidor atiende al de la llave.
  // EN: Business the key must answer for (X-05); without it, the server serves the key's own.
  businessId?: string;
};

/**
 * ES: Lee y valida la configuración del entorno. Nunca registra ni devuelve
 *     la llave en mensajes de error.
 * EN: Reads and validates the environment configuration. It never logs or
 *     returns the key in error messages.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Configuración inválida del servidor MCP: ${missing}`);
  }
  return {
    apiKey: parsed.data.LUYOA_API_KEY,
    apiBaseUrl: parsed.data.LUYOA_API_BASE_URL,
  };
}
