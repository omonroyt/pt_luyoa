/**
 * ES: Etiquetas en español para las claves de agrupación. La API no envía etiqueta
 *     cuando agrupa por mes, semana, día u hora, y en categorías devuelve el
 *     identificador técnico (cafe_caliente).
 * EN: Spanish labels for grouping keys. The API sends no label when grouping by
 *     month, week, day or hour, and for categories it returns the technical id
 *     (cafe_caliente).
 */

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const WEEKDAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

const CATEGORIES: Record<string, string> = {
  cafe_caliente: "Café caliente",
  cafe_frio: "Café frío",
  otras_bebidas: "Otras bebidas",
  panaderia: "Panadería",
  comida: "Comida",
};

export function monthLabel(monthKey: string): string {
  const month = MONTHS[Number(monthKey.slice(5, 7)) - 1];
  return month ? `${month} ${monthKey.slice(0, 4)}` : monthKey;
}

export function dayLabel(dateKey: string): string {
  const month = MONTHS[Number(dateKey.slice(5, 7)) - 1];
  return month ? `${Number(dateKey.slice(8, 10))} de ${month} ${dateKey.slice(0, 4)}` : dateKey;
}

export function weekdayLabel(isoWeekday: number): string {
  return WEEKDAYS[isoWeekday - 1] ?? String(isoWeekday);
}

export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function categoryLabel(category: string): string {
  return CATEGORIES[category] ?? category;
}

type LabelInput = { dimension: string; key: string | number; apiLabel?: string };

const LABELERS: Record<string, (key: string | number) => string> = {
  month: (key) => monthLabel(String(key)),
  day: (key) => dayLabel(String(key)),
  week: (key) => `semana del ${dayLabel(String(key))}`,
  weekday: (key) => weekdayLabel(Number(key)),
  hour: (key) => hourLabel(Number(key)),
  category: (key) => categoryLabel(String(key)),
};

/**
 * ES: Etiqueta legible de una fila agrupada: usa la de la API cuando es descriptiva
 *     y la calcula en los demás casos.
 * EN: Readable label for a grouped row: uses the API label when it is descriptive
 *     and computes it otherwise.
 */
export function groupLabel(input: LabelInput): string {
  const labeler = LABELERS[input.dimension];
  if (labeler && (input.dimension === "category" || !input.apiLabel)) return labeler(input.key);
  return input.apiLabel ?? String(input.key);
}
