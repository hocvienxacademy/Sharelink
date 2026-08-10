import type { AuthenticatedActor } from "@/shared/authorization";
import type { DateOnly } from "@/shared/time";
import type {
  ApplicationStatus,
  Gender,
} from "@/modules/applications/domain/application";
import type { AdmissionQualification } from "@/shared/domain";
import type { StaffApplicationAuthorizationResource } from "@/modules/applications/application/authorization/staff-application-authorization";

export interface ApplicationWordExportRelative {
  readonly position: number;
  readonly fullName: string | null;
  readonly relationship: string | null;
  readonly occupation: string | null;
  readonly phone: string | null;
  readonly address: string | null;
}

export interface ApplicationWordExportRecord {
  readonly id: string;
  readonly applicationCode: string | null;
  readonly status: ApplicationStatus;
  readonly submittedAt: Date | null;
  readonly majorName: string | null;
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
  readonly relatives: readonly ApplicationWordExportRelative[];
}

export interface StudentWordDownloadInput {
  readonly codeDigest: string;
  readonly lockedUntil: Date;
  readonly maximumAttempts: number;
  readonly requestId: string;
  readonly token: string;
  readonly attemptedAt: Date;
}

export interface StaffWordDownloadInput {
  readonly actor: AuthenticatedActor;
  readonly applicationId: string;
  readonly requestId: string;
}

export interface WordExportRepository {
  authorizeStudentDownload(
    input: StudentWordDownloadInput,
  ): Promise<ApplicationWordExportRecord | null>;
  findStaffAuthorizationResource(
    applicationId: string,
  ): Promise<StaffApplicationAuthorizationResource | null>;
  loadForStaffDownload(
    input: StaffWordDownloadInput,
  ): Promise<ApplicationWordExportRecord | null>;
}
