/**
 * ES: Salud de una sucursal comparada contra su propio historial, no contra el tamaño
 *     de las demás. El nivel de preocupación sale de reglas explícitas y auditables.
 * EN: Location health compared against its own history, not against the size of the
 *     others. The concern level comes from explicit, auditable rules.
 */
import type { SalesRow, VisitsRow } from "../api/schemas";
import { monthLabel } from "./labels";
import { delta, roundTo, type Delta } from "./metrics";

export type LocationInputs = {
  id: string;
  name: string;
  recent: { sales?: SalesRow; visits?: VisitsRow };
  baseline: { sales?: SalesRow; visits?: VisitsRow };
  monthly: readonly SalesRow[];
  risk: { at_risk: number; dormant: number };
};

type Snapshot = {
  net_sales: number;
  transactions: number;
  avg_ticket: number;
  visits_per_day: number;
};
type Changes = Record<keyof Snapshot, Delta>;
type ConcernLevel = "alta" | "media" | "baja";

const DROP_THRESHOLD = -10;
const SEVERE_DROP_THRESHOLD = -20;
const HIGH_CONCERN_SCORE = 3;
const TREND_WINDOW_MONTHS = 3;

function snapshotOf(period: LocationInputs["recent"]): Snapshot {
  return {
    net_sales: period.sales?.net_sales ?? 0,
    transactions: period.sales?.transactions ?? 0,
    avg_ticket: period.sales?.avg_ticket ?? 0,
    visits_per_day: period.visits?.visits_per_day ?? 0,
  };
}

/**
 * ES: Variación del promedio mensual de los últimos 3 meses contra los 3 anteriores.
 * EN: Change of the monthly average of the last 3 months against the previous 3.
 */
function quarterTrend(monthly: readonly SalesRow[]): Delta {
  const values = [...monthly]
    .sort((a, b) => String(a.key).localeCompare(String(b.key)))
    .map((row) => row.net_sales ?? 0);
  const average = (items: number[]) =>
    items.reduce((sum, item) => sum + item, 0) / (items.length || 1);
  const last = values.slice(-TREND_WINDOW_MONTHS);
  const previous = values.slice(-2 * TREND_WINDOW_MONTHS, -TREND_WINDOW_MONTHS);
  return delta(roundTo(average(last)), roundTo(average(previous)));
}

type Rule = {
  points: (changes: Changes, trend: Delta) => number;
  reason: (changes: Changes, trend: Delta) => string;
};

const pct = (value: Delta) => value.percent ?? 0;

function salesDropPoints(percent: number): number {
  if (percent <= SEVERE_DROP_THRESHOLD) return 2;
  return percent <= DROP_THRESHOLD ? 1 : 0;
}

function levelFor(score: number): ConcernLevel {
  if (score >= HIGH_CONCERN_SCORE) return "alta";
  return score > 0 ? "media" : "baja";
}

const RULES: Rule[] = [
  {
    points: (c) => salesDropPoints(pct(c.net_sales)),
    reason: (c) => `Ventas netas ${pct(c.net_sales)}% contra el periodo base.`,
  },
  {
    points: (c) => (pct(c.transactions) <= DROP_THRESHOLD ? 1 : 0),
    reason: (c) => `Tickets ${pct(c.transactions)}% contra el periodo base.`,
  },
  {
    points: (c) => (pct(c.visits_per_day) <= DROP_THRESHOLD ? 1 : 0),
    reason: (c) => `Visitas con tarjeta por día ${pct(c.visits_per_day)}% contra el periodo base.`,
  },
  {
    points: (_c, trend) => (pct(trend) <= DROP_THRESHOLD ? 1 : 0),
    reason: (_c, trend) =>
      `Promedio mensual de los últimos 3 meses ${pct(trend)}% contra los 3 anteriores.`,
  },
];

function concernOf(changes: Changes, trend: Delta) {
  const triggered = RULES.filter((rule) => rule.points(changes, trend) > 0);
  const score = triggered.reduce((sum, rule) => sum + rule.points(changes, trend), 0);
  return {
    level: levelFor(score),
    score,
    reasons: triggered.map((rule) => rule.reason(changes, trend)),
  };
}

export function assessLocation(input: LocationInputs) {
  const recent = snapshotOf(input.recent);
  const baseline = snapshotOf(input.baseline);
  const changes: Changes = {
    net_sales: delta(recent.net_sales, baseline.net_sales),
    transactions: delta(recent.transactions, baseline.transactions),
    avg_ticket: delta(recent.avg_ticket, baseline.avg_ticket),
    visits_per_day: delta(recent.visits_per_day, baseline.visits_per_day),
  };
  const trend = quarterTrend(input.monthly);
  return {
    id: input.id,
    name: input.name,
    recent,
    baseline,
    change: changes,
    quarter_trend: trend,
    monthly_series: input.monthly.map((row) => ({
      month: String(row.key),
      label: monthLabel(String(row.key)),
      net_sales: row.net_sales ?? 0,
    })),
    // ES: El total va calculado (ADR-09): en M6 un modelo lo sumaba por su cuenta y daba
    //     una cifra sin fuente.
    // EN: The total comes computed (ADR-09): in M6 a model added it up on its own and gave
    //     an unsourced figure.
    risk_customers: { ...input.risk, total: input.risk.at_risk + input.risk.dormant },
    concern: concernOf(changes, trend),
  };
}

export type LocationAssessment = ReturnType<typeof assessLocation>;

export function rankByConcern(assessments: LocationAssessment[]): LocationAssessment[] {
  return [...assessments].sort(
    (a, b) =>
      b.concern.score - a.concern.score || pct(a.change.net_sales) - pct(b.change.net_sales),
  );
}
