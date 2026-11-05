import { NextResponse } from "next/server";

/**
 * ES: Indica qué variables están configuradas, sin revelar ningún valor.
 * EN: Reports which variables are configured, without revealing any value.
 */
export function GET(): NextResponse {
  const configured = (name: string) => Boolean(process.env[name]?.trim());

  return NextResponse.json({
    status: "ok",
    env: {
      LUYOA_API_KEY: configured("LUYOA_API_KEY"),
      OPENROUTER_API_KEY: configured("OPENROUTER_API_KEY"),
      APPROVAL_SECRET: configured("APPROVAL_SECRET"),
      MCP_SERVICE_TOKEN: configured("MCP_SERVICE_TOKEN"),
      BUSINESSES: configured("BUSINESSES"),
      CRON_SECRET: configured("CRON_SECRET"),
      DEMO_ACCESS_CODE: configured("DEMO_ACCESS_CODE"),
    },
    // ES: Tipo de base, no su dirección: "turso" en el despliegue, "archivo" en local.
    // EN: Database kind, not its address: "turso" when deployed, "archivo" locally.
    database: process.env.DATABASE_URL?.startsWith("libsql:") ? "turso" : "archivo",
  });
}
