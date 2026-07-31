export type DateOnly = `${number}-${number}-${number}`;

export interface Clock {
  now(): Date;
  today(): DateOnly;
}

function padDatePart(value: number): string {
  return value.toString().padStart(2, "0");
}

export function toLocalDateOnly(value: Date): DateOnly {
  return `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(value.getDate())}` as DateOnly;
}

export function toDatabaseDateOnly(value: Date): DateOnly {
  return value.toISOString().slice(0, 10) as DateOnly;
}

export const systemClock: Clock = {
  now: () => new Date(),
  today: () => toLocalDateOnly(new Date()),
};
