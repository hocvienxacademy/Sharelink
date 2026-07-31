import type { DateOnly } from "../../../shared/time/index";

export interface AdmissionPeriod {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly startDate: DateOnly | null;
  readonly endDate: DateOnly | null;
  readonly isActive: boolean;
}

export interface Major {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly displayOrder: number;
  readonly isActive: boolean;
}

export interface CatalogRepository {
  findAdmissionPeriodById(id: string): Promise<AdmissionPeriod | null>;
  findActiveMajorById(id: string): Promise<Major | null>;
  listActiveAdmissionPeriods(): Promise<readonly AdmissionPeriod[]>;
  listActiveMajors(): Promise<readonly Major[]>;
}
