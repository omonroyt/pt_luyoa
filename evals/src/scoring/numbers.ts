/**
 * ES: Extracción y comparación de cifras para las verificaciones deterministas (08 §4.1).
 *     Lee números en el formato que escribe el agente ("$808,254", "4.2%", "−1.3%") y los
 *     compara con tolerancia de redondeo: una cifra mostrada con d decimales coincide si
 *     el valor de referencia redondeado a d decimales es igual. Se comparan valores
 *     absolutos, porque "bajó 31%" y "−31%" dicen lo mismo, y se acepta el valor ×100
 *     (una tasa 0.2687 mostrada como 26.9%).
 * EN: Figure extraction and comparison for the deterministic checks (08 §4.1). It reads
 *     numbers in the format the agent writes ("$808,254", "4.2%", "−1.3%") and compares
 *     them with rounding tolerance: a figure shown with d decimals matches if the
 *     reference value rounded to d decimals is equal. Absolute values are compared,
 *     because "bajó 31%" and "−31%" say the same, and the value ×100 is accepted (a rate
 *     0.2687 shown as 26.9%).
 */
export type ShownNumber = { value: number; decimals: number; raw: string };

const NUMBER = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;

// ES: Texto que no es una cifra del negocio: fechas, años, horas e identificadores. Un
//     año se escribe sin separador de miles; "2,026" sigue contando como cifra.
// EN: Text that is not a business figure: dates, years, times and identifiers. A year is
//     written without a thousands separator; "2,026" still counts as a figure.
const NOT_FIGURES = [
  /\b\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?\b/g,
  /(?<![\d,.])20[23]\d(?!\d|[,.]\d)/g,
  /\b\d{1,2}:\d{2}\b/g,
  /\b(?:src|cmp|cus|prd|loc|biz|apr|msg)_[A-Za-z0-9_]+/g,
];

export function stripNonFigures(text: string): string {
  return NOT_FIGURES.reduce((current, pattern) => current.replace(pattern, " "), text);
}

// ES: "288 mil" es 288,000 redondeado a miles (decimales = −3), también en un rango como
//     "288-330 mil" o "288 a 330 mil"; "millones" y "miles" no se tocan.
// EN: "288 mil" is 288,000 rounded to thousands (decimals = −3), also in a range such as
//     "288-330 mil" or "288 a 330 mil"; "millones" and "miles" are left alone.
const THOUSANDS = /^(?:\s*[-–]\s*\$?[\d.,]+|\s+(?:a|y)\s+\$?[\d.,]+)?\s+mil(?![a-záéíóú])/i;
const THOUSAND = 1000;
const THOUSANDS_DECIMALS = -3;

// ES: Una cifra marcada como aproximada ("~$8,300", "unos 18,000") se compara redondeada a
//     sus ceros finales: 8,346 cuenta como "~8,300". "18,000+" no está marcada así.
// EN: A figure marked as approximate ("~$8,300", "unos 18,000") is compared rounded to its
//     trailing zeros: 8,346 counts as "~8,300". "18,000+" is not marked that way.
const APPROXIMATE = /(?:~|\bunos?\s|\bunas?\s|alrededor de\s|cerca de\s|aproximadamente\s)\$?$/i;

const decimalsOf = (plain: string) =>
  plain.includes(".") ? (plain.split(".")[1]?.length ?? 0) : 0;

const trailingZeros = (plain: string) =>
  plain.includes(".") ? 0 : (/0+$/.exec(plain)?.[0].length ?? 0);

export function extractNumbers(text: string): ShownNumber[] {
  const clean = stripNonFigures(text);
  return [...clean.matchAll(NUMBER)].map((match) => {
    const raw = match[0];
    const plain = raw.replaceAll(",", "");
    const start = match.index ?? 0;
    const thousands = THOUSANDS.test(clean.slice(start + raw.length));
    const approximate = APPROXIMATE.test(clean.slice(0, start)) ? trailingZeros(plain) : 0;
    return {
      value: Number(plain) * (thousands ? THOUSAND : 1),
      decimals: decimalsOf(plain) - approximate + (thousands ? THOUSANDS_DECIMALS : 0),
      raw: thousands ? `${raw} mil` : raw,
    };
  });
}

const PERCENT_SCALE = 100;

const TOLERANCE = 1e-9;

// ES: Se acepta el redondeo y también el truncamiento a los decimales mostrados: 1,222.74
//     escrito como "$1,222" es un descuido de formato, no una cifra inventada.
// EN: Both rounding and truncation to the shown decimals are accepted: 1,222.74 written as
//     "$1,222" is a formatting slip, not an invented figure.
function shownForms(value: number, decimals: number): number[] {
  const factor = 10 ** decimals;
  const scaled = Math.abs(value) * factor;
  return [Math.round(scaled) / factor, Math.trunc(scaled + TOLERANCE) / factor];
}

export function matchesShown(shown: ShownNumber, reference: number): boolean {
  const target = Math.abs(shown.value);
  return [reference, reference * PERCENT_SCALE].some((candidate) =>
    shownForms(candidate, shown.decimals).some(
      (form) => Math.abs(form - target) < TOLERANCE * target + TOLERANCE,
    ),
  );
}

// ES: Todos los números de un valor JSON, también los que aparecen dentro de textos.
// EN: All numbers in a JSON value, including the ones inside strings.
export function numbersIn(value: unknown): number[] {
  if (typeof value === "number") return [value];
  if (typeof value === "string") return extractNumbers(value).map((shown) => shown.value);
  if (Array.isArray(value)) return value.flatMap(numbersIn);
  if (value && typeof value === "object") return Object.values(value).flatMap(numbersIn);
  return [];
}
