/**
 * ES: Aritmética de fechas locales del negocio (AAAA-MM-DD, America/Mexico_City).
 *     Se opera con fechas puras en UTC para que la zona horaria de la máquina no
 *     desplace ningún día.
 * EN: Date arithmetic on the business local dates (YYYY-MM-DD, America/Mexico_City).
 *     Plain dates are handled in UTC so the machine time zone never shifts a day.
 */
import { ToolFailure } from "../errors";

const MS_PER_DAY = 86_400_000;
const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtcDate(value: string): Date {
  const match = LOCAL_DATE.exec(value);
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : null;
  if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ToolFailure({
      code: "validation_error",
      message: `Fecha inválida: ${value}`,
      suggestion: "Usar el formato AAAA-MM-DD.",
    });
  }
  return date;
}

const toLocalDate = (date: Date): string => date.toISOString().slice(0, 10);

export function assertLocalDate(value: string): string {
  return toLocalDate(toUtcDate(value));
}

export function addDays(value: string, days: number): string {
  return toLocalDate(new Date(toUtcDate(value).getTime() + days * MS_PER_DAY));
}

export function daysInclusive(from: string, to: string): number {
  return Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / MS_PER_DAY) + 1;
}

export function startOfMonth(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

export function addMonths(monthStart: string, months: number): string {
  const date = toUtcDate(startOfMonth(monthStart));
  return toLocalDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)));
}

export function endOfMonth(value: string): string {
  return addDays(addMonths(startOfMonth(value), 1), -1);
}

export function isLastDayOfMonth(value: string): boolean {
  return endOfMonth(value) === value;
}

/**
 * ES: Día de la semana con lunes = 1 y domingo = 7, igual que la API.
 * EN: Day of the week with Monday = 1 and Sunday = 7, matching the API.
 */
export function isoWeekday(value: string): number {
  const day = toUtcDate(value).getUTCDay();
  return day === 0 ? 7 : day;
}
