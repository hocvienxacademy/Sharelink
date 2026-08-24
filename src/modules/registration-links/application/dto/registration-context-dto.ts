import type { AdmissionQualification } from "../../../../shared/domain/index";
import type { MajorItemDto } from "../../../catalogs/index";
import type { RegistrationLinkStatus } from "../../domain/registration-link";

export interface RegistrationContextApplicationDto {
  readonly id: string;
  readonly status: string;
}

export interface RegistrationContextDto {
  readonly status: RegistrationLinkStatus;
  readonly majors: readonly MajorItemDto[];
  readonly studentNameHint: string | null;
  readonly entryQualification: AdmissionQualification | null;
  readonly hasApplication: boolean;
  readonly application: RegistrationContextApplicationDto | null;
}
