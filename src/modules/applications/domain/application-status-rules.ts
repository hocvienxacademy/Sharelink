import type { ApplicationStatus } from "./application";

export function isApplicationSubmittable(
  status: ApplicationStatus,
): boolean {
  return status === "DRAFT";
}
