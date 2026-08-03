export {
  APPLICATION_STATUSES,
  GENDERS,
  type Application,
  type ApplicationRelative,
  type ApplicationStatus,
  type Gender,
} from "./domain/application";
export { isApplicationSubmittable } from "./domain/application-status-rules";
export type {
  ApplicationRelativeDto,
  DraftApplicationDto,
  EditableApplicationDto,
  SubmittedApplicationResultDto,
} from "./application/dto/application-dto";
export type {
  ApplicationRepository,
  CreateDraftPersistenceInput,
  SubmissionPolicy,
  SubmitApplicationPersistenceInput,
  UpdateDraftPersistenceInput,
} from "./application/ports/application-repository";
export {
  DEFAULT_SUBMISSION_POLICY_CONFIG,
  DefaultSubmissionPolicy,
  RELATIVE_COMPLETENESS_FIELDS,
  type DefaultSubmissionPolicyConfig,
  type RelativeCompletenessField,
} from "./application/policies/default-submission-policy";
export { CreateDraftApplication } from "./application/services/create-draft-application";
export { GetEditableApplication } from "./application/services/get-editable-application";
export { SubmitApplication } from "./application/services/submit-application";
export { UpdateDraftApplication } from "./application/services/update-draft-application";
export {
  applicationIdentifierSchema,
  applicationRelativeInputSchema,
  createDraftApplicationSchema,
  parseApplicationIdentifier,
  parseCreateDraftApplicationInput,
  parseSubmitApplicationInput,
  parseUpdateDraftApplicationInput,
  submitApplicationSchema,
  updateDraftApplicationSchema,
  type ApplicationRelativeInput,
  type CreateDraftApplicationInput,
  type SubmitApplicationInput,
  type UpdateDraftApplicationInput,
} from "./application/validation/application-schemas";
export {
  getAdminApplicationDetail,
  listAdminApplications,
  type AdminApplicationDetail,
  type AdminApplicationListItem,
} from "./infrastructure/prisma-admin-application-queries";
