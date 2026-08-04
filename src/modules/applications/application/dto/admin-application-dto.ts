export interface AdminApplicationListItem {
  readonly admissionPeriod: string;
  readonly applicationCode: string | null;
  readonly createdAt: Date;
  readonly fullName: string | null;
  readonly id: string;
  readonly major: string;
  readonly saleName: string;
  readonly status: string;
  readonly submittedAt: Date | null;
}

export interface AdminApplicationHistoryItem {
  readonly id: string;
  readonly actorName: string;
  readonly createdAt: Date;
  readonly newStatus: string;
  readonly previousStatus: string | null;
  readonly reason: string | null;
}

export type AdminApplicationHistory = readonly AdminApplicationHistoryItem[];

export interface AdminApplicationDetail extends AdminApplicationListItem {
  readonly version: number;
  readonly admissionDiploma: string | null;
  readonly maskedCitizenId: string;
  readonly contactAddressProvided: boolean;
  readonly dataProcessingConsent: boolean;
  readonly dateOfBirth: Date | null;
  readonly declarationConfirmed: boolean;
  readonly email: string | null;
  readonly entryQualification: string | null;
  readonly gender: string | null;
  readonly graduateMajor: string | null;
  readonly graduationYear: number | null;
  readonly highSchoolName: string | null;
  readonly histories: AdminApplicationHistory;
  readonly payment: { readonly amount: string | null; readonly status: string } | null;
  readonly permanentAddressProvided: boolean;
  readonly phone: string | null;
  readonly relatives: readonly {
    readonly fullName: string | null;
    readonly position: number;
    readonly relationship: string | null;
  }[];
  readonly reviewedAt: Date | null;
  readonly reviewerName: string | null;
}
