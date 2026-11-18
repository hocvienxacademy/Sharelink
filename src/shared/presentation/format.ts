/**
 * Display formatting shared by server pages and client components. Time zones
 * are fixed so the server render, the browser and every viewer agree.
 */

const EMPTY = "—";

// Explicit parts give "01/08/2026"; `dateStyle: "short"` prints "1/8/26".
const dateParts = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
} as const;

const dateTimeFormat = new Intl.DateTimeFormat("vi-VN", {
  ...dateParts,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Ho_Chi_Minh",
});

// Date-only values (birth dates, period start/end) are stored as UTC midnight,
// so they must be printed in UTC or they shift by a day west of Greenwich.
const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  ...dateParts,
  timeZone: "UTC",
});

const moneyFormat = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

type DateInput = Date | string | null;

const toDate = (value: Date | string) =>
  value instanceof Date ? value : new Date(value);

/** A moment in time, shown in Vietnam time, e.g. "14:30 15/10/2026". */
export function formatDateTime(value: DateInput): string {
  return value === null ? EMPTY : dateTimeFormat.format(toDate(value));
}

/** A calendar date without time, e.g. "15/10/2026". */
export function formatDate(value: DateInput): string {
  return value === null ? EMPTY : dateFormat.format(toDate(value));
}

/** An amount in VND; accepts Prisma Decimal strings as well as numbers. */
export function formatMoney(value: number | string | null): string {
  return value === null ? EMPTY : moneyFormat.format(Number(value));
}
