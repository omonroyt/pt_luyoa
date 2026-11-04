/**
 * ES: Solicitudes que se graban como fixtures para probar las herramientas sin red.
 *     Los periodos corresponden a data_as_of = 2026-10-31.
 * EN: Requests recorded as fixtures to test the tools without network access.
 *     Periods correspond to data_as_of = 2026-10-31.
 */
export type FixtureRequest = {
  method: "GET" | "POST";
  path: string;
  params?: Record<string, string | number>;
  body?: unknown;
};

const SEPTEMBER = { from: "2026-09-01", to: "2026-09-30" };
const OCTOBER = { from: "2026-10-01", to: "2026-10-31" };
const LAST_12_WEEKS = { from: "2026-08-09", to: "2026-10-31" };
const PREVIOUS_12_WEEKS = { from: "2026-05-17", to: "2026-08-08" };
const LAST_3_MONTHS = { from: "2026-08-01", to: "2026-10-31" };
const ALL_DATA = { from: "2025-11-01", to: "2026-10-31" };
const LOCATIONS = ["loc_coyoacan", "loc_polanco", "loc_roma"];
const CHANNELS = ["push", "whatsapp", "email"];

const get = (path: string, params?: FixtureRequest["params"]): FixtureRequest => ({
  method: "GET",
  path,
  params,
});

const sales = (groupBy: string, range: object, extra: object = {}) =>
  get("/v1/analytics/sales", { group_by: groupBy, ...range, ...extra });

const visits = (groupBy: string, range: object) =>
  get("/v1/analytics/visits", { group_by: groupBy, ...range });

const preview = (channel: string, audience: object): FixtureRequest => ({
  method: "POST",
  path: "/v1/campaigns/preview",
  body: { channel, audience },
});

export const FIXTURE_REQUESTS: FixtureRequest[] = [
  get("/v1/business"),
  get("/v1/locations"),
  get("/v1/segments"),
  get("/v1/products", { limit: 100 }),
  get("/v1/campaigns", { limit: 100 }),
  get("/v1/campaigns/cmp_0004"),
  get("/v1/customers/cus_0001"),
  get("/v1/customers/cus_no_existe"),
  ...[SEPTEMBER, OCTOBER].flatMap((month) => [
    sales("location", month),
    sales("category", month),
    visits("location", month),
  ]),
  ...[LAST_12_WEEKS, PREVIOUS_12_WEEKS].flatMap((range) => [
    sales("location", range),
    visits("location", range),
  ]),
  sales("weekday", LAST_12_WEEKS),
  sales("hour", LAST_12_WEEKS),
  visits("weekday", LAST_12_WEEKS),
  ...LOCATIONS.map((location) => sales("weekday", LAST_12_WEEKS, { location_id: location })),
  sales("category", LAST_3_MONTHS),
  sales("product", LAST_3_MONTHS),
  sales("location", LAST_3_MONTHS),
  ...LOCATIONS.map((location) => sales("month", ALL_DATA, { location_id: location })),
  ...LOCATIONS.flatMap((location) =>
    ["at_risk", "dormant"].map((segment) =>
      get("/v1/customers", { segment, home_location_id: location, limit: 1 }),
    ),
  ),
  ...["at_risk", "dormant"].flatMap((segment) =>
    CHANNELS.map((channel) => preview(channel, { segment_id: segment })),
  ),
  get("/v1/customers", { tier: "gold", limit: 1 }),
];
