import type { AdmissionQualification } from "../../../../shared/domain/index";
import type { MajorItemDto, PublicBankAccount } from "../../../catalogs/index";
import type { RegistrationLinkStatus } from "../../domain/registration-link";

export interface RegistrationContextApplicationDto {
  readonly id: string;
  readonly status: string;
}

export interface PublicPaymentInformationDto {
  readonly account: PublicBankAccount | null;
  readonly applicationFeeAmount: number | null;
  readonly instructions: string | null;
}

export interface RegistrationContextDto {
  readonly status: RegistrationLinkStatus;
  readonly majors: readonly MajorItemDto[];
  readonly majorId: string | null;
  readonly studentNameHint: string | null;
  readonly entryQualification: AdmissionQualification | null;
  readonly hasApplication: boolean;
  readonly application: RegistrationContextApplicationDto | null;
  readonly payment: PublicPaymentInformationDto;
}
