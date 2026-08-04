import type { AdmissionQualification } from "../../../shared/domain/index";
import type { DateOnly } from "../../../shared/time/index";

export const APPLICATION_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "WAITING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "NEEDS_REVISION",
  "VALID",
  "PRINTED",
  "COMPLETED",
  "CANCELLED",
] as const;

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type Gender = (typeof GENDERS)[number];

export interface ApplicationRelative {
  readonly id: string;
  readonly position: number;
  readonly fullName: string | null;
  readonly relationship: string | null;
  readonly occupation: string | null;
  readonly phone: string | null;
  readonly address: string | null;
}

export interface Application {
  readonly id: string;
  readonly registrationLinkId: string;
  readonly status: ApplicationStatus;
  readonly majorId: string | null;
  readonly admissionPeriodId: string | null;
  readonly entryQualification: AdmissionQualification | null;
  readonly fullName: string | null;
  readonly gender: Gender | null;
  readonly dateOfBirth: DateOnly | null;
  readonly placeOfBirth: string | null;
  readonly ethnicity: string | null;
  readonly religion: string | null;
  readonly nationality: string | null;
  readonly citizenId: string | null;
  readonly citizenIdIssuedDate: DateOnly | null;
  readonly citizenIdIssuedPlace: string | null;
  readonly permanentAddress: string | null;
  readonly workplace: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly contactAddress: string | null;
  readonly admissionDiploma: AdmissionQualification | null;
  readonly graduateMajor: string | null;
  readonly graduationYear: number | null;
  readonly highSchoolName: string | null;
  readonly highSchoolWard: string | null;
  readonly highSchoolProvince: string | null;
  readonly declarationPlace: string | null;
  readonly declarationDate: DateOnly | null;
  readonly declarationConfirmed: boolean;
  readonly dataProcessingConsent: boolean;
  readonly submittedAt: Date | null;
  readonly version: number;
  readonly latestRevisionReason?: string | null;
  readonly relatives: readonly ApplicationRelative[];
}
