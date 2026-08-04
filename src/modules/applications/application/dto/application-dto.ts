import type { AdmissionQualification } from "../../../../shared/domain/index";
import type { DateOnly } from "../../../../shared/time/index";
import type {
  ApplicationStatus,
  Gender,
} from "../../domain/application";

export interface ApplicationRelativeDto {
  readonly position: number;
  readonly fullName: string | null;
  readonly relationship: string | null;
  readonly occupation: string | null;
  readonly phone: string | null;
  readonly address: string | null;
}

export interface DraftApplicationDto {
  readonly id: string;
  readonly status: ApplicationStatus;
  readonly version: number;
}

export interface EditableApplicationDto extends DraftApplicationDto {
  readonly latestRevisionReason?: string | null;
  readonly majorId: string | null;
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
  readonly relatives: readonly ApplicationRelativeDto[];
}

export interface SubmittedApplicationResultDto {
  readonly id: string;
  readonly status: ApplicationStatus;
  readonly submittedAt: string;
  readonly version: number;
}
