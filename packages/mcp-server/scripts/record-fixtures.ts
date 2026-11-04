/**
 * ES: Graba las respuestas reales de la API como fixtures de prueba. Elimina los datos
 *     personales antes de escribir y nunca imprime la llave.
 *     Uso: pnpm --filter @alborada/mcp-server fixtures:record
 * EN: Records real API responses as test fixtures. Removes personal data before
 *     writing and never prints the key.
 *     Usage: pnpm --filter @alborada/mcp-server fixtures:record
 */
import { writeFileSync } from "node:fs";
import { loadConfig } from "../src/config";
import { fixtureKey, type FixtureFile } from "../src/testing/fixture-key";
import { FIXTURE_REQUESTS, type FixtureRequest } from "../src/testing/fixture-requests";

const PERSONAL_FIELDS = new Set([
  "first_name",
  "last_name",
  "phone",
  "email",
  "birth_date",
  "card_number",
]);
const OUTPUT = new URL("../src/testing/fixtures/api-responses.json", import.meta.url);

/**
 * ES: Quita recursivamente los campos personales de una respuesta.
 * EN: Recursively strips personal fields from a response.
 */
function stripPersonalData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripPersonalData);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !PERSONAL_FIELDS.has(key))
      .map(([key, nested]) => [key, stripPersonalData(nested)]),
  );
}

async function record(request: FixtureRequest, baseUrl: string, apiKey: string) {
  const url = new URL(request.path, baseUrl);
  Object.entries(request.params ?? {}).forEach(([key, value]) =>
    url.searchParams.set(key, String(value)),
  );
  const body = request.body === undefined ? undefined : JSON.stringify(request.body);
  const response = await fetch(url, {
    method: request.method,
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body,
  });
  const json: unknown = await response.json();
  return { key: fixtureKey(request.method, url, body), status: response.status, json };
}

const config = loadConfig();
const fixtures: FixtureFile = {};
for (const request of FIXTURE_REQUESTS) {
  const { key, status, json } = await record(request, config.apiBaseUrl, config.apiKey);
  fixtures[key] = { status, body: stripPersonalData(json) };
  console.warn(`${status} ${key}`);
}
writeFileSync(OUTPUT, `${JSON.stringify(fixtures, null, 2)}\n`);
console.warn(`${Object.keys(fixtures).length} fixtures grabadas sin datos personales.`);
