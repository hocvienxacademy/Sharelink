import type { AdmissionQualification } from "../../../../shared/domain/index";
import type { AdmissionPeriodDto, MajorItemDto } from "../../../catalogs/index";
import type { RegistrationLinkStatus } from "../../domain/registration-link";

export interface RegistrationContextApplicationDto {
  readonly id: string;
  readonly status: string;
}

export interface RegistrationContextBankAccountDto {
  readonly bankCode: string;
  readonly bankName: string;
  readonly branchName: string | null;
  readonly accountNumber: string;
  readonly accountName: string;
}

export interface RegistrationContextDto {
  readonly status: RegistrationLinkStatus;
  readonly admissionPeriod: AdmissionPeriodDto;
  readonly majors: readonly MajorItemDto[];
  readonly studentNameHint: string | null;
  readonly entryQualification: AdmissionQualification | null;
  readonly hasApplication: boolean;
  readonly application: RegistrationContextApplicationDto | null;
  readonly bankAccount: RegistrationContextBankAccountDto | null;
  readonly paymentInstructions: string | null;
}
