import type { ApplicationStatus } from "./application";

export function isApplicationSubmittable(
  status: ApplicationStatus,
): status is "DRAFT" | "NEEDS_REVISION" {
  return status === "DRAFT" || status === "NEEDS_REVISION";
}

export function isApplicationStudentEditable(status: ApplicationStatus): status is "DRAFT" | "NEEDS_REVISION" {
  return status === "DRAFT" || status === "NEEDS_REVISION";
}

export function isApplicationStaffEditable(status: ApplicationStatus): boolean {
  return status === "DRAFT" || status === "SUBMITTED" || status === "NEEDS_REVISION";
}
