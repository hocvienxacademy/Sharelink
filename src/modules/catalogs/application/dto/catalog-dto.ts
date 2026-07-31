import type { DateOnly } from "../../../../shared/time/index";

export interface AdmissionPeriodDto {
  readonly code: string;
  readonly name: string;
  readonly startDate: DateOnly | null;
  readonly endDate: DateOnly | null;
}

export interface MajorItemDto {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}
