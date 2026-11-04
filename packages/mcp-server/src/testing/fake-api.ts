/**
 * ES: fetch falso que responde con las fixtures grabadas. Una solicitud no grabada
 *     responde 599 con un mensaje explícito, para que la prueba falle en vez de
 *     trabajar con datos inventados.
 * EN: Fake fetch that answers with the recorded fixtures. An unrecorded request
 *     answers 599 with an explicit message, so the test fails instead of working
 *     with made-up data.
 */
import { readFileSync } from "node:fs";
import { fixtureKey, type FixtureFile } from "./fixture-key";

const FIXTURES_URL = new URL("./fixtures/api-responses.json", import.meta.url);
const MISSING_FIXTURE_STATUS = 599;

let cachedFixtures: FixtureFile | undefined;

export function loadFixtures(): FixtureFile {
  cachedFixtures ??= JSON.parse(readFileSync(FIXTURES_URL, "utf8")) as FixtureFile;
  return cachedFixtures;
}

export type FakeFetch = typeof fetch & { calls: string[] };

export function createFakeFetch(overrides: FixtureFile = {}): FakeFetch {
  const calls: string[] = [];
  const fixtures = { ...loadFixtures(), ...overrides };
  const fakeFetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const key = fixtureKey(init?.method ?? "GET", url, init?.body ? String(init.body) : undefined);
    calls.push(key);
    const fixture = fixtures[key];
    if (!fixture) {
      const message = `Fixture no grabada: ${key}`;
      return new Response(JSON.stringify({ error: { code: "missing_fixture", message } }), {
        status: MISSING_FIXTURE_STATUS,
      });
    }
    return new Response(JSON.stringify(fixture.body), { status: fixture.status });
  };
  return Object.assign(fakeFetch, { calls }) as FakeFetch;
}
