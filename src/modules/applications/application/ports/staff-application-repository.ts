import type { Application } from "../../domain/application";
import type { ApplicationRelativeInput, UpdateDraftApplicationInput } from "../validation/application-schemas";
import type { ApplicationFeeTransferStatus } from "../../domain/application-fee";

export type StaffMutationScope =
  | { readonly kind: "all" }
  | { readonly kind: "manager"; readonly managerId: string };

export interface StaffContentUpdateInput {
  readonly actorId: string;
  readonly actorRole: "MANAGER" | "ADMIN";
  readonly applicationId: string;
  readonly changedFields: readonly string[];
  readonly expectedStatus: "DRAFT" | "SUBMITTED" | "NEEDS_REVISION";
  readonly expectedVersion: number;
  readonly requestId: string;
  readonly scope: StaffMutationScope;
  readonly values: UpdateDraftApplicationInput;
  readonly majorId: string | null | undefined;
  readonly entryQualification: import("@/shared/domain").AdmissionQualification | null | undefined;
}

export interface StaffReviewInput {
  readonly actorId: string;
  readonly actorRole: "MANAGER" | "ADMIN";
  readonly applicationId: string;
  readonly expectedVersion: number;
  readonly newStatus: "NEEDS_REVISION" | "VALID";
  readonly reason: string | null;
  readonly requestId: string;
  readonly reviewedAt: Date;
  readonly scope: StaffMutationScope;
}

export interface StaffApplicationFeeUpdateInput {
  readonly actorId: string;
  readonly applicationId: string;
  readonly expectedVersion: number;
  readonly occurredAt: Date;
  readonly reason: string | null;
  readonly requestId: string;
  readonly status: ApplicationFeeTransferStatus;
}

export interface StaffApplicationFeeUpdateResult {
  readonly reason: string | null;
  readonly status: ApplicationFeeTransferStatus;
  readonly version: number;
}

export interface StaffApplicationRepository {
  findById(id: string): Promise<Application | null>;
  review(input: StaffReviewInput): Promise<Application>;
  updateContent(input: StaffContentUpdateInput): Promise<Application>;
  updateFee(input: StaffApplicationFeeUpdateInput): Promise<StaffApplicationFeeUpdateResult>;
}

export type { ApplicationRelativeInput };
