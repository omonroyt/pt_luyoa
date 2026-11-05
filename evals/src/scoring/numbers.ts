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
  /(?<![\d,.])20[23]\d(?![\d,]|\.\d)/g,
  /\b\d{1,2}:\d{2}\b/g,
  /\b(?:src|cmp|cus|prd|loc|biz|apr|msg)_[A-Za-z0-9_]+/g,
];

export function stripNonFigures(text: string): string {
  return NOT_FIGURES.reduce((current, pattern) => current.replace(pattern, " "), text);
}

export function extractNumbers(text: string): ShownNumber[] {
  return [...stripNonFigures(text).matchAll(NUMBER)].map((match) => {
    const raw = match[0];
    const plain = raw.replaceAll(",", "");
    const decimals = plain.includes(".") ? (plain.split(".")[1]?.length ?? 0) : 0;
    return { value: Number(plain), decimals, raw };
  });
}

const PERCENT_SCALE = 100;

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(Math.abs(value) * factor) / factor;
}

export function matchesShown(shown: ShownNumber, reference: number): boolean {
  const target = Math.abs(shown.value);
  return [reference, reference * PERCENT_SCALE].some(
    (candidate) => roundTo(candidate, shown.decimals) === target,
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
