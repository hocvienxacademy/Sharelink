import { z } from "zod";
import {
  APPLICATION_STATUSES,
  SUBMISSION_EMAIL_STATUSES,
  type ApplicationStatus,
  type SubmissionEmailStatus,
} from "../../domain/application";
import {
  APPLICATION_FEE_TRANSFER_STATUSES,
  type ApplicationFeeTransferStatus,
} from "../../domain/application-fee";

const FILTER_FIELDS = ["status", "fee", "email", "major", "submittedAt"] as const;
const DATE_MODES = ["relative", "custom"] as const;
const DATE_PRESETS = ["previous_week", "current_week", "previous_month", "current_month"] as const;

const filterFieldSchema = z.enum(FILTER_FIELDS);
const dateModeSchema = z.enum(DATE_MODES);
const datePresetSchema = z.enum(DATE_PRESETS);
const applicationStatusSchema = z.enum(APPLICATION_STATUSES);
const feeStatusSchema = z.enum(APPLICATION_FEE_TRANSFER_STATUSES);
const emailStatusSchema = z.enum(SUBMISSION_EMAIL_STATUSES);
const majorIdSchema = z.uuid();
const MAX_SEARCH_LENGTH = 150;

export type StaffApplicationFilterField = (typeof FILTER_FIELDS)[number];
export type StaffApplicationDateMode = (typeof DATE_MODES)[number];
export type StaffApplicationDatePreset = (typeof DATE_PRESETS)[number];

export type StaffApplicationListFilter =
  | { readonly kind: "status"; readonly value: ApplicationStatus }
  | { readonly kind: "fee"; readonly value: ApplicationFeeTransferStatus }
  | { readonly kind: "email"; readonly value: SubmissionEmailStatus }
  | { readonly kind: "major"; readonly majorId: string }
  | { readonly kind: "submittedAt"; readonly from: Date; readonly toExclusive: Date };

export interface StaffApplicationListFilterState {
  readonly search: string;
  readonly field: StaffApplicationFilterField | null;
  readonly value: string | null;
  readonly dateMode: StaffApplicationDateMode;
  readonly datePreset: StaffApplicationDatePreset;
  readonly dateFrom: string | null;
  readonly dateTo: string | null;
}

export interface ParsedStaffApplicationListFilter {
  readonly filter?: StaffApplicationListFilter;
  readonly search?: string;
  readonly state: StaffApplicationListFilterState;
  readonly error?: string;
}

type SearchParams = Readonly<Record<string, string | readonly string[] | undefined>>;
type CalendarDate = { readonly year: number; readonly month: number; readonly day: number };

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1_000;

function first(value: string | readonly string[] | undefined): string | undefined {
  return typeof value === "string" ? value : value?.[0];
}

function parseCalendarDate(value: string | undefined): CalendarDate | null {
  if (value === undefined) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const test = new Date(Date.UTC(year, month - 1, day));
  return test.getUTCFullYear() === year && test.getUTCMonth() === month - 1 && test.getUTCDate() === day
    ? { year, month, day }
    : null;
}

function addCalendarDays(value: CalendarDate, days: number): CalendarDate {
  const date = new Date(Date.UTC(value.year, value.month - 1, value.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function bangkokInstant(value: CalendarDate): Date {
  return new Date(Date.UTC(value.year, value.month - 1, value.day) - BANGKOK_OFFSET_MS);
}

function bangkokToday(now: Date): CalendarDate {
  const shifted = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function relativeDateRange(preset: StaffApplicationDatePreset, now: Date) {
  const today = bangkokToday(now);
  const todayUtc = new Date(Date.UTC(today.year, today.month - 1, today.day));
  const mondayOffset = (todayUtc.getUTCDay() + 6) % 7;
  const currentWeekStart = addCalendarDays(today, -mondayOffset);
  const currentMonthStart = { year: today.year, month: today.month, day: 1 };
  const nextMonthStart = addCalendarDays(
    { year: today.year, month: today.month + 1, day: 1 },
    0,
  );

  if (preset === "current_week") return { from: currentWeekStart, toExclusive: addCalendarDays(currentWeekStart, 7) };
  if (preset === "previous_week") return { from: addCalendarDays(currentWeekStart, -7), toExclusive: currentWeekStart };
  if (preset === "current_month") return { from: currentMonthStart, toExclusive: nextMonthStart };
  const previousMonthStart = addCalendarDays({ year: today.year, month: today.month - 1, day: 1 }, 0);
  return { from: previousMonthStart, toExclusive: currentMonthStart };
}

function initialState(params: SearchParams): StaffApplicationListFilterState {
  const fieldResult = filterFieldSchema.safeParse(first(params.filterField));
  const modeResult = dateModeSchema.safeParse(first(params.dateMode));
  const presetResult = datePresetSchema.safeParse(first(params.datePreset));
  return {
    search: first(params.q) ?? "",
    field: fieldResult.success ? fieldResult.data : null,
    value: first(params.filterValue) ?? null,
    dateMode: modeResult.success ? modeResult.data : "relative",
    datePreset: presetResult.success ? presetResult.data : "current_week",
    dateFrom: first(params.dateFrom) ?? null,
    dateTo: first(params.dateTo) ?? null,
  };
}

export function parseStaffApplicationListFilter(
  params: SearchParams,
  now = new Date(),
): ParsedStaffApplicationListFilter {
  const state = initialState(params);
  const normalizedSearch = state.search.trim();
  const search = normalizedSearch.length === 0 || normalizedSearch.length > MAX_SEARCH_LENGTH
    ? undefined
    : normalizedSearch;
  const searchError = normalizedSearch.length > MAX_SEARCH_LENGTH
    ? `Chuỗi tìm kiếm không được vượt quá ${MAX_SEARCH_LENGTH} ký tự.`
    : undefined;
  const complete = (
    result: Omit<ParsedStaffApplicationListFilter, "search" | "state">,
  ): ParsedStaffApplicationListFilter => ({
    ...result,
    ...(search === undefined ? {} : { search }),
    state,
    error: [result.error, searchError].filter(Boolean).join(" ") || undefined,
  });

  if (state.field === null) return complete({});

  if (state.field === "status") {
    const result = applicationStatusSchema.safeParse(state.value);
    return result.success
      ? complete({ filter: { kind: "status", value: result.data } })
      : complete({ error: "Vui lòng chọn trạng thái hồ sơ hợp lệ." });
  }
  if (state.field === "fee") {
    const result = feeStatusSchema.safeParse(state.value);
    return result.success
      ? complete({ filter: { kind: "fee", value: result.data } })
      : complete({ error: "Vui lòng chọn trạng thái lệ phí hợp lệ." });
  }
  if (state.field === "email") {
    const result = emailStatusSchema.safeParse(state.value);
    return result.success
      ? complete({ filter: { kind: "email", value: result.data } })
      : complete({ error: "Vui lòng chọn trạng thái email hợp lệ." });
  }
  if (state.field === "major") {
    const result = majorIdSchema.safeParse(state.value);
    return result.success
      ? complete({ filter: { kind: "major", majorId: result.data } })
      : complete({ error: "Vui lòng chọn ngành hợp lệ." });
  }

  if (state.dateMode === "relative") {
    const range = relativeDateRange(state.datePreset, now);
    return complete({
      filter: {
        kind: "submittedAt",
        from: bangkokInstant(range.from),
        toExclusive: bangkokInstant(range.toExclusive),
      },
    });
  }

  const from = parseCalendarDate(state.dateFrom ?? undefined);
  const to = parseCalendarDate(state.dateTo ?? undefined) ?? from;
  if (from === null || to === null) return complete({ error: "Vui lòng chọn ngày hoặc khoảng ngày cần lọc." });
  const fromInstant = bangkokInstant(from);
  const toExclusive = bangkokInstant(addCalendarDays(to, 1));
  if (fromInstant >= toExclusive) return complete({ error: "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu." });
  return complete({ filter: { kind: "submittedAt", from: fromInstant, toExclusive } });
}
