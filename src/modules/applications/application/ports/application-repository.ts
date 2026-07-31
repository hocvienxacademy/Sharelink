import type { AdmissionQualification } from "../../../../shared/domain/index";
import type { ValidationIssue } from "../../../../shared/validation/index";
import type { Application } from "../../domain/application";
import type {
  ApplicationRelativeInput,
  CreateDraftApplicationInput,
  UpdateDraftApplicationInput,
} from "../validation/application-schemas";

export interface CreateDraftPersistenceInput {
  readonly registrationLinkId: string;
  readonly saleId: string;
  readonly admissionPeriodId: string;
  readonly majorId: string | null;
  readonly entryQualification: AdmissionQualification | null;
  readonly studentNameHint: string | null;
  readonly values: CreateDraftApplicationInput;
}

export interface UpdateDraftPersistenceInput {
  readonly applicationId: string;
  readonly registrationLinkId: string;
  readonly expectedVersion: number;
  readonly majorId: string | null | undefined;
  readonly entryQualification: AdmissionQualification | null | undefined;
  readonly values: UpdateDraftApplicationInput;
}

export interface SubmitApplicationPersistenceInput {
  readonly applicationId: string;
  readonly registrationLinkId: string;
  readonly expectedVersion: number;
  readonly submittedAt: Date;
}

export interface ApplicationRepository {
  createDraft(input: CreateDraftPersistenceInput): Promise<Application>;
  findByRegistrationContext(
    registrationLinkId: string,
    applicationId: string,
  ): Promise<Application | null>;
  findByRegistrationLinkId(
    registrationLinkId: string,
  ): Promise<Application | null>;
  submit(input: SubmitApplicationPersistenceInput): Promise<Application>;
  updateDraft(input: UpdateDraftPersistenceInput): Promise<Application>;
}

export interface SubmissionPolicy {
  validate(application: Application): readonly ValidationIssue[];
}

export type { ApplicationRelativeInput };
