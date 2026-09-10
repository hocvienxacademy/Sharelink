import {
  CreateDraftApplication,
  DefaultSubmissionPolicy,
  GetEditableApplication,
  SubmitApplication,
  UpdateDraftApplication,
} from "../modules/applications/index";
import {
  DirectSubmissionEmailDispatcher,
  PrismaApplicationRepository,
} from "../modules/applications/infrastructure/index";
import { PrismaAdminApplicationQueryRepository } from "@/modules/applications/infrastructure/prisma-admin-application-queries";
import { QueryStaffApplications } from "@/modules/applications/application/services/query-staff-applications";
import { StaffApplicationAdministration } from "@/modules/applications/application/services/staff-application-administration";
import { catalogRepository } from "./catalogs";
import { validateRegistrationLink } from "./registration-links";
import { systemClock } from "@/shared/time";
import { ExportCredentialFactory } from "@/modules/word-export/application/export-credential";
import { createSmtpEmailSender } from "@/shared/email";
import { downloadApplicationWord } from "./word-export";

export const applicationRepository = new PrismaApplicationRepository();
export const defaultSubmissionPolicy = new DefaultSubmissionPolicy();
const adminApplicationQueryRepository = new PrismaAdminApplicationQueryRepository();
export const staffApplicationQueries = new QueryStaffApplications(
  adminApplicationQueryRepository,
);
export const staffApplicationAdministration = new StaffApplicationAdministration(
  adminApplicationQueryRepository,
  applicationRepository,
  catalogRepository,
  defaultSubmissionPolicy,
);

export const createDraftApplication = new CreateDraftApplication(
  validateRegistrationLink,
  catalogRepository,
  applicationRepository,
);
export const getEditableApplication = new GetEditableApplication(
  validateRegistrationLink,
  applicationRepository,
);
export const updateDraftApplication = new UpdateDraftApplication(
  validateRegistrationLink,
  catalogRepository,
  applicationRepository,
);
const submissionEmailDispatcher =
  process.env.APP_ENV === "build" || process.env.APP_ENV === "test"
    ? undefined
    : new DirectSubmissionEmailDispatcher(
        downloadApplicationWord,
        createSmtpEmailSender(),
      );
export const submitApplication = new SubmitApplication(
  validateRegistrationLink,
  catalogRepository,
  applicationRepository,
  defaultSubmissionPolicy,
  systemClock,
  new ExportCredentialFactory(),
  submissionEmailDispatcher,
);
