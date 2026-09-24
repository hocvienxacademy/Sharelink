"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarIcon, RotateCcwIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  StaffApplicationDateMode,
  StaffApplicationDatePreset,
  StaffApplicationFilterField,
  StaffApplicationListFilterState,
} from "../../application/validation/staff-application-list-filter";

interface MajorOption {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly isActive: boolean;
}

const STATUS_OPTIONS = [
  ["DRAFT", "Bản nháp"], ["SUBMITTED", "Đã nộp"], ["WAITING_PAYMENT", "Chờ thanh toán"],
  ["PAYMENT_CONFIRMED", "Đã xác nhận phí"], ["NEEDS_REVISION", "Cần bổ sung"], ["VALID", "Hợp lệ"],
  ["PRINTED", "Đã in"], ["COMPLETED", "Hoàn tất"], ["CANCELLED", "Đã hủy"],
] as const;
const FEE_OPTIONS = [["NOT_TRANSFERRED", "Chưa chuyển"], ["TRANSFERRED", "Đã chuyển"]] as const;
const EMAIL_OPTIONS = [["NOT_SENT", "Chưa gửi"], ["PENDING", "Đang chờ"], ["SENT", "Đã gửi"], ["FAILED", "Thất bại"]] as const;
const DATE_PRESET_OPTIONS = [
  ["previous_week", "Tuần trước"], ["current_week", "Tuần này"],
  ["previous_month", "Tháng trước"], ["current_month", "Tháng này"],
] as const;

function parseDate(value: string | null): Date | undefined {
  if (value === null) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (match === null) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function dateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function rangeFromState(state: StaffApplicationListFilterState): DateRange | undefined {
  const from = parseDate(state.dateFrom);
  if (from === undefined) return undefined;
  return { from, to: parseDate(state.dateTo) };
}

function optionLabel(options: readonly (readonly [string, string])[], value: string): string {
  return options.find(([option]) => option === value)?.[1] ?? "Chọn giá trị";
}

export function ApplicationListFilters({
  initialState,
  majors,
  serverError,
}: {
  readonly initialState: StaffApplicationListFilterState;
  readonly majors: readonly MajorOption[];
  readonly serverError?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialState.search);
  const [field, setField] = useState<StaffApplicationFilterField | null>(initialState.field);
  const [value, setValue] = useState(initialState.value ?? "");
  const [dateMode, setDateMode] = useState<StaffApplicationDateMode>(initialState.dateMode);
  const [datePreset, setDatePreset] = useState<StaffApplicationDatePreset>(initialState.datePreset);
  const [range, setRange] = useState<DateRange | undefined>(() => rangeFromState(initialState));

  useEffect(() => {
    setSearch(initialState.search);
    setField(initialState.field);
    setValue(initialState.value ?? "");
    setDateMode(initialState.dateMode);
    setDatePreset(initialState.datePreset);
    setRange(rangeFromState(initialState));
  }, [initialState]);

  useEffect(() => {
    const normalizedSearch = search.trim();
    if (normalizedSearch === initialState.search.trim()) return;

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (normalizedSearch === "") params.delete("q");
      else params.set("q", normalizedSearch);
      startTransition(() => router.replace(params.size === 0 ? pathname : `${pathname}?${params.toString()}`));
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [initialState.search, pathname, router, search]);

  const selectedValueLabel = useMemo(() => {
    if (field === "status") return optionLabel(STATUS_OPTIONS, value);
    if (field === "fee") return optionLabel(FEE_OPTIONS, value);
    if (field === "email") return optionLabel(EMAIL_OPTIONS, value);
    if (field === "major") {
      const major = majors.find((item) => item.id === value);
      return major === undefined ? "Chọn ngành" : `${major.code} — ${major.name}`;
    }
    return "Chọn giá trị";
  }, [field, majors, value]);

  function navigateTo(params: URLSearchParams): void {
    const normalizedSearch = search.trim();
    if (normalizedSearch !== "") params.set("q", normalizedSearch);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }

  function filterByValue(nextValue: string): void {
    if (field === null || field === "submittedAt") return;
    navigateTo(new URLSearchParams({ filterField: field, filterValue: nextValue }));
  }

  function filterByPreset(nextPreset: StaffApplicationDatePreset): void {
    navigateTo(new URLSearchParams({
      filterField: "submittedAt",
      dateMode: "relative",
      datePreset: nextPreset,
    }));
  }

  function filterByRange(nextRange: DateRange | undefined): void {
    if (nextRange?.from === undefined) return;
    const params = new URLSearchParams({
      filterField: "submittedAt",
      dateMode: "custom",
      dateFrom: dateValue(nextRange.from),
    });
    if (nextRange.to !== undefined) params.set("dateTo", dateValue(nextRange.to));
    navigateTo(params);
  }

  function clearFilter(): void {
    startTransition(() => router.replace(pathname));
  }

  const options = field === "status" ? STATUS_OPTIONS : field === "fee" ? FEE_OPTIONS : EMAIL_OPTIONS;
  const rangeLabel = range?.from === undefined
    ? "Chọn ngày hoặc khoảng ngày"
    : range.to === undefined
      ? format(range.from, "dd/MM/yyyy", { locale: vi })
      : `${format(range.from, "dd/MM/yyyy", { locale: vi })} - ${format(range.to, "dd/MM/yyyy", { locale: vi })}`;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Bộ lọc hồ sơ</CardTitle>
        <CardDescription>Tìm theo họ tên hoặc số điện thoại và kết hợp với một điều kiện lọc.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="application-search">Tìm kiếm</FieldLabel>
            <Input
              id="application-search"
              type="search"
              autoComplete="off"
              maxLength={150}
              placeholder="Nhập tên hoặc số điện thoại sinh viên"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(12rem,0.8fr)_minmax(16rem,1.4fr)_auto] xl:items-end">
            <Field>
              <FieldLabel htmlFor="application-filter-field">Trường lọc</FieldLabel>
              <Select
                value={field ?? ""}
                onValueChange={(next) => {
                  if (next !== "status" && next !== "fee" && next !== "email" && next !== "major" && next !== "submittedAt") return;
                  setField(next);
                  setValue("");
                  if (next === "submittedAt") {
                    if (dateMode === "relative") filterByPreset(datePreset);
                    else filterByRange(range);
                  }
                }}
              >
                <SelectTrigger id="application-filter-field" className="w-full">
                  <SelectValue>{field === "status" ? "Trạng thái" : field === "fee" ? "Lệ phí" : field === "email" ? "Email" : field === "major" ? "Ngành" : field === "submittedAt" ? "Ngày nộp" : "Chọn trường lọc"}</SelectValue>
                </SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem value="status">Trạng thái</SelectItem>
                  <SelectItem value="fee">Lệ phí</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="major">Ngành</SelectItem>
                  <SelectItem value="submittedAt">Ngày nộp</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </Field>

            {field !== null && field !== "submittedAt" ? (
              <Field>
                <FieldLabel htmlFor="application-filter-value">Giá trị</FieldLabel>
                <Select
                  value={value}
                  onValueChange={(next) => {
                    if (typeof next !== "string" || next === "") return;
                    setValue(next);
                    filterByValue(next);
                  }}
                >
                  <SelectTrigger id="application-filter-value" className="w-full"><SelectValue>{selectedValueLabel}</SelectValue></SelectTrigger>
                  <SelectContent><SelectGroup>
                    {field === "major"
                      ? majors.map((major) => <SelectItem key={major.id} value={major.id}>{major.code} — {major.name}{major.isActive ? "" : " (ngừng sử dụng)"}</SelectItem>)
                      : options.map(([optionValue, label]) => <SelectItem key={optionValue} value={optionValue}>{label}</SelectItem>)}
                  </SelectGroup></SelectContent>
                </Select>
              </Field>
            ) : null}

            {field === "submittedAt" ? (
              <div className="grid gap-4 md:col-span-2 xl:col-span-1 xl:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="application-date-mode">Kiểu lọc</FieldLabel>
                  <Select
                    value={dateMode}
                    onValueChange={(next) => {
                      if (next !== "relative" && next !== "custom") return;
                      setDateMode(next);
                      if (next === "relative") filterByPreset(datePreset);
                    }}
                  >
                    <SelectTrigger id="application-date-mode" className="w-full"><SelectValue>{dateMode === "relative" ? "Tương đối" : "Tùy chọn"}</SelectValue></SelectTrigger>
                    <SelectContent><SelectGroup><SelectItem value="relative">Tương đối</SelectItem><SelectItem value="custom">Tùy chọn</SelectItem></SelectGroup></SelectContent>
                  </Select>
                </Field>
                {dateMode === "relative" ? (
                  <Field>
                    <FieldLabel htmlFor="application-date-preset">Khoảng thời gian</FieldLabel>
                    <Select
                      value={datePreset}
                      onValueChange={(next) => {
                        if (!DATE_PRESET_OPTIONS.some(([item]) => item === next)) return;
                        const nextPreset = next as StaffApplicationDatePreset;
                        setDatePreset(nextPreset);
                        filterByPreset(nextPreset);
                      }}
                    >
                      <SelectTrigger id="application-date-preset" className="w-full"><SelectValue>{optionLabel(DATE_PRESET_OPTIONS, datePreset)}</SelectValue></SelectTrigger>
                      <SelectContent><SelectGroup>{DATE_PRESET_OPTIONS.map(([optionValue, label]) => <SelectItem key={optionValue} value={optionValue}>{label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                  </Field>
                ) : (
                  <Field>
                    <FieldLabel>Khoảng ngày</FieldLabel>
                    <Popover>
                      <PopoverTrigger render={<Button type="button" variant="outline" className="w-full justify-start rounded-lg font-normal" />}>
                        <CalendarIcon data-icon="inline-start" />{rangeLabel}
                      </PopoverTrigger>
                      <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] overflow-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={range}
                          onSelect={(nextRange) => {
                            setRange(nextRange);
                            filterByRange(nextRange);
                          }}
                          numberOfMonths={2}
                          locale={vi}
                          defaultMonth={range?.from}
                        />
                      </PopoverContent>
                    </Popover>
                  </Field>
                )}
              </div>
            ) : null}

            <div className="flex gap-2 md:col-span-2 xl:col-span-1">
              <Button type="button" variant="outline" disabled={pending || initialState.field === null} onClick={clearFilter}>
                <RotateCcwIcon data-icon="inline-start" /> Xóa lọc
              </Button>
            </div>
          </div>
          {serverError === undefined ? null : <Alert variant="destructive"><AlertDescription>{serverError}</AlertDescription></Alert>}
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
