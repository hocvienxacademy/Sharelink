import type { RegistrationLinkStatus } from "../../domain/registration-link";

export interface CatalogReferenceDto {
  readonly code: string;
  readonly name: string;
}

export interface AdminRegistrationLinkListItem {
  readonly admissionPeriod: CatalogReferenceDto | null;
  readonly applicationStatus: string | null;
  readonly createdAt: Date;
  readonly expiresAt: Date | null;
  readonly id: string;
  readonly major: CatalogReferenceDto | null;
  readonly saleName: string;
  readonly status: RegistrationLinkStatus;
  readonly studentNameHint: string | null;
  readonly tuitionAmount: string | null;
}

export interface AdminRegistrationLinkHistoryItem {
  readonly actorName: string;
  readonly createdAt: Date;
  readonly newStatus: string;
  readonly previousStatus: string | null;
  readonly reason: string | null;
}

export interface AdminRegistrationLinkDetail extends AdminRegistrationLinkListItem {
  readonly accessCount: number;
  readonly admissionPeriodId: string | null;
  readonly applicationId: string | null;
  readonly entryQualification: string | null;
  readonly expiresAtIso: string | null;
  readonly histories: readonly AdminRegistrationLinkHistoryItem[];
  readonly internalNote: string | null;
  readonly majorId: string | null;
  readonly paymentRound: string | null;
  readonly publicUrl: string | null;
  readonly saleId: string;
  readonly updatedAtIso: string;
}

export type AdminRegistrationLinkHistory = readonly AdminRegistrationLinkHistoryItem[];
