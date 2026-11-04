/**
 * ES: Prueba de humo del servidor MCP por stdio contra la API real: arranca el servidor
 *     como proceso aparte (igual que Claude Desktop o el Inspector de MCP), lista las
 *     herramientas y llama tres de ellas.
 *     Uso: pnpm --filter @alborada/mcp-server smoke
 * EN: Smoke test of the MCP server over stdio against the real API: starts the server
 *     as a separate process (just like Claude Desktop or the MCP Inspector), lists the
 *     tools and calls three of them.
 *     Usage: pnpm --filter @alborada/mcp-server smoke
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const CLI_PATH = new URL("../src/cli.ts", import.meta.url);

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["--import", "tsx", decodeURIComponent(CLI_PATH.pathname.replace(/^\/([A-Za-z]:)/, "$1"))],
  env: process.env as Record<string, string>,
  stderr: "ignore",
});
const client = new Client({ name: "smoke-stdio", version: "0.0.0" });
await client.connect(transport);

const call = async (name: string, args: Record<string, unknown> = {}) => {
  const started = Date.now();
  const result = await client.callTool({ name, arguments: args });
  const [first] = result.content as Array<{ text: string }>;
  const payload = JSON.parse(first?.text ?? "{}") as {
    data?: Record<string, unknown>;
    error?: unknown;
  };
  console.warn(`${result.isError ? "ERROR" : "ok   "} ${name} (${Date.now() - started} ms)`);
  return payload;
};

const { tools } = await client.listTools();
console.warn(`${tools.length} herramientas: ${tools.map((tool) => tool.name).join(", ")}`);

const context = await call("get_business_context");
const comparison = await call("compare_periods", {
  current: "last_full_month",
  previous: "previous_full_month",
});
const reach = await call("audience_reach", { audience: { segment_id: "at_risk" } });

const summary = {
  data_as_of: (context.data?.calendar as { dataAsOf?: string } | undefined)?.dataAsOf,
  net_sales_change: (comparison.data?.delta as { net_sales?: unknown } | undefined)?.net_sales,
  at_risk_reach: (
    reach.data?.by_channel as Array<{ channel: string; reachable: number }> | undefined
  )?.map((row) => `${row.channel}=${row.reachable}`),
};
console.warn(JSON.stringify(summary));
await client.close();
