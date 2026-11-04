/**
 * ES: Genera las respuestas de referencia de cada escenario llamando la API directamente,
 *     sin el agente ni el servidor MCP (docs/specs/08_PLAN_EVALUACION.md §2).
 *     Uso: pnpm golden
 * EN: Generates the reference answer for each scenario by calling the API directly,
 *     without the agent or the MCP server (docs/specs/08_PLAN_EVALUACION.md §2).
 *     Usage: pnpm golden
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createGoldenApi, type GoldenApi } from "./golden/api-client";
import { scenarioRanges } from "./golden/dates";
import {
  goldenCampaignResults,
  goldenLostCustomers,
  goldenRecoveryCampaign,
} from "./golden/scenarios-customers";
import {
  goldenCategoryProfit,
  goldenLocationTrend,
  goldenMonthComparison,
  goldenWorstWeekday,
} from "./golden/scenarios-sales";

const OUTPUT_DIR = new URL("../golden/", import.meta.url);

type Ranges = ReturnType<typeof scenarioRanges>;
type Scenario = { id: string; build: (api: GoldenApi, ranges: Ranges) => Promise<object> };

const SCENARIOS: Scenario[] = [
  { id: "E-01", build: goldenMonthComparison },
  { id: "E-02", build: goldenWorstWeekday },
  { id: "E-03", build: goldenLocationTrend },
  { id: "E-04", build: (api) => goldenLostCustomers(api) },
  { id: "E-05", build: (api) => goldenCampaignResults(api) },
  { id: "E-06", build: goldenRecoveryCampaign },
  { id: "EJEMPLO", build: goldenCategoryProfit },
];

const business = await createGoldenApi().get<{ data_as_of: string }>("/v1/business");
const ranges = scenarioRanges(business.data_as_of);
mkdirSync(OUTPUT_DIR, { recursive: true });

for (const scenario of SCENARIOS) {
  const api = createGoldenApi();
  const answer = await scenario.build(api, ranges);
  const file = new URL(`${scenario.id}.json`, OUTPUT_DIR);
  const content = {
    id: scenario.id,
    data_as_of: business.data_as_of,
    ...answer,
    endpoints: api.endpoints,
  };
  writeFileSync(file, `${JSON.stringify(content, null, 2)}\n`);
  console.log(
    `${scenario.id}: ${api.endpoints.length} consultas → evals/golden/${scenario.id}.json`,
  );
}
