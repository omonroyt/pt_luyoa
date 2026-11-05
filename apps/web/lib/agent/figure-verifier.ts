/**
 * ES: Verificador de cifras (ADR-09, 07 §6, IMP-33). Antes de mostrar un bloque comprueba
 *     que (1) solo cite fuentes de esta conversación, (2) cada número salga de alguna de
 *     ellas, con tolerancia de redondeo, y (3) la tarjeta de campaña tenga el alcance del
 *     último audience_reach citado y un mensaje dentro del límite del canal. Si algo falla,
 *     el bloque no se muestra y el modelo recibe la lista de problemas para corregir.
 * EN: Figure verifier (ADR-09, 07 §6, IMP-33). Before showing a block it checks that
 *     (1) it only cites sources from this conversation, (2) every number comes from one of
 *     them, within rounding tolerance, and (3) the campaign card carries the reach of the
 *     latest cited audience_reach and a message within the channel limit. If anything
 *     fails, the block is not shown and the model receives the list of problems to fix.
 */
import { MESSAGE_LIMITS, type CampaignCardBlock } from "@alborada/shared";
import { z } from "zod";
import { collectNumbers, type RegisteredSource, type SourceRegistry } from "./source-registry";

const MAX_DECIMALS = 4;
const MAX_LISTED = 8;
const EPSILON = 1e-9;

export class FigureVerificationError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(
      [
        "Verificación de cifras: el bloque no se mostró.",
        ...problems.map((problem) => `- ${problem}`),
        "Usa solo las cifras exactas de los resultados citados. Si necesitas un total o una",
        "proporción que ninguna herramienta entrega, muestra las cifras por separado.",
      ].join("\n"),
    );
    this.name = "FigureVerificationError";
    this.problems = problems;
  }
}

function decimals(value: number): number {
  const text = String(value);
  const dot = text.indexOf(".");
  return dot < 0 ? 0 : Math.min(text.length - dot - 1, MAX_DECIMALS);
}

const roundTo = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places;

/**
 * ES: Una cifra del bloque coincide con una de la fuente si son iguales al redondear la de
 *     la fuente a los decimales mostrados; también se acepta una proporción (0.5569)
 *     mostrada como porcentaje (55.7).
 * EN: A block figure matches a source figure if they are equal after rounding the source
 *     one to the shown decimals; a ratio (0.5569) shown as a percentage (55.7) is accepted.
 */
export function matchesSource(shown: number, source: number): boolean {
  const places = decimals(shown);
  return [source, source * 100].some(
    (candidate) => Math.abs(roundTo(candidate, places) - shown) < EPSILON,
  );
}

function blockFigures(name: string, block: Record<string, unknown>): number[] {
  if (name === "show_chart") return collectNumbers(block.data);
  if (name === "show_table") return collectNumbers([block.rows, block.totalRow]);
  if (name === "show_kpis") return collectNumbers(block.items);
  if (name === "show_campaign_card") {
    return collectNumbers([block.reach, block.economics, block.expectedImpact, block.history]);
  }
  return [];
}

function unsupportedFigures(figures: number[], cited: RegisteredSource[]): string[] {
  const pool = cited.flatMap((source) => source.numbers);
  const missing = [...new Set(figures)].filter(
    (figure) => !pool.some((value) => matchesSource(figure, value)),
  );
  if (missing.length === 0) return [];
  const listed = missing.slice(0, MAX_LISTED).join(", ");
  return [`Estas cifras no aparecen en las fuentes citadas: ${listed}.`];
}

const ReachRow = z.object({
  channel: z.string(),
  matched: z.number(),
  reachable: z.number(),
  excluded_no_consent: z.number(),
  excluded_suspended: z.number(),
  excluded_duplicates: z.number(),
});
const ReachData = z.object({ by_channel: z.array(ReachRow) });

function reachProblems(card: CampaignCardBlock, cited: RegisteredSource[]): string[] {
  const latest = cited
    .filter((source) => source.tool === "audience_reach")
    .sort((a, b) => b.order - a.order)[0];
  if (!latest) return ["La tarjeta debe citar el resultado de audience_reach de su audiencia."];
  const row = ReachData.safeParse(latest.data).data?.by_channel.find(
    (entry) => entry.channel === card.channel,
  );
  if (!row) return [`El audience_reach citado no incluye el canal ${card.channel}.`];
  const expected = {
    matched: row.matched,
    reachable: row.reachable,
    excludedNoConsent: row.excluded_no_consent,
    excludedSuspended: row.excluded_suspended,
    excludedDuplicates: row.excluded_duplicates,
  };
  const wrong = Object.entries(expected).filter(
    ([key, value]) => card.reach[key as keyof typeof expected] !== value,
  );
  return wrong.map(([key, value]) => `reach.${key} debe ser ${value}, como en ${latest.id}.`);
}

function messageProblems(card: CampaignCardBlock): string[] {
  const limit = MESSAGE_LIMITS[card.channel];
  const length = [...card.message.text].length;
  const problems: string[] = [];
  if (card.message.limit !== limit)
    problems.push(`message.limit debe ser ${limit} para ${card.channel}.`);
  if (card.message.length !== length) problems.push(`message.length debe ser ${length}.`);
  if (length > limit)
    problems.push(`El mensaje tiene ${length} caracteres; el límite es ${limit}.`);
  return problems;
}

export function verifyBlock(name: string, block: unknown, registry: SourceRegistry): string[] {
  const record = block as Record<string, unknown> & { sources?: string[] };
  const ids = record.sources ?? [];
  const unknown = ids.filter((id) => !registry.get(id));
  const problems = unknown.map((id) => `La fuente ${id} no es un resultado de esta conversación.`);
  const cited = ids.flatMap((id) => registry.get(id) ?? []);
  problems.push(...unsupportedFigures(blockFigures(name, record), cited));
  if (name === "show_campaign_card") {
    const card = block as CampaignCardBlock;
    problems.push(...reachProblems(card, cited), ...messageProblems(card));
  }
  return problems;
}

export function assertVerified(name: string, block: unknown, registry: SourceRegistry): void {
  const problems = verifyBlock(name, block, registry);
  if (problems.length > 0) throw new FigureVerificationError(problems);
}
