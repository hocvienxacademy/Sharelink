import type { AdmissionQualification } from "../../../shared/domain/index";

export const REGISTRATION_LINK_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "LOCKED",
  "SUBMITTED",
  "EXPIRED",
  "CANCELLED",
  "ARCHIVED",
] as const;

export type RegistrationLinkStatus =
  (typeof REGISTRATION_LINK_STATUSES)[number];

export interface RegistrationLink {
  readonly id: string;
  readonly saleId: string;
  readonly admissionPeriodId: string | null;
  readonly majorId: string | null;
  readonly studentNameHint: string | null;
  readonly entryQualification: AdmissionQualification | null;
  readonly status: RegistrationLinkStatus;
  readonly expiresAt: Date | null;
  readonly applicationId: string | null;
  readonly applicationStatus: string | null;
}

export interface RegistrationLinkRepository {
  findByPublicToken(token: string): Promise<RegistrationLink | null>;
}
