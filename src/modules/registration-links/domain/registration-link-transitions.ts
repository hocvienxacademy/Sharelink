import { InvalidStateTransitionError } from "@/shared/errors";
import type { RegistrationLinkStatus } from "./registration-link";

export const REGISTRATION_LINK_TRANSITION_ACTIONS = [
  "activate",
  "lock",
  "unlock",
  "cancel",
  "archive",
] as const;
export type RegistrationLinkTransitionAction =
  (typeof REGISTRATION_LINK_TRANSITION_ACTIONS)[number];

const TARGET_STATUS: Record<RegistrationLinkTransitionAction, RegistrationLinkStatus> = {
  activate: "ACTIVE",
  lock: "LOCKED",
  unlock: "ACTIVE",
  cancel: "CANCELLED",
  archive: "ARCHIVED",
};

export interface RegistrationLinkTransitionContext {
  readonly applicationId: string | null;
  readonly expiresAt: Date | null;
  readonly now: Date;
  readonly status: RegistrationLinkStatus;
}

export function registrationLinkTransitionTarget(
  action: RegistrationLinkTransitionAction,
): RegistrationLinkStatus {
  return TARGET_STATUS[action];
}

export function assertRegistrationLinkTransition(
  action: RegistrationLinkTransitionAction,
  context: RegistrationLinkTransitionContext,
): void {
  const futureExpiry =
    context.expiresAt === null || context.expiresAt > context.now;
  const allowed =
    (action === "activate" && context.status === "DRAFT" && futureExpiry) ||
    (action === "lock" && context.status === "ACTIVE") ||
    (action === "unlock" && context.status === "LOCKED" && futureExpiry) ||
    (action === "cancel" &&
      ["DRAFT", "ACTIVE", "LOCKED"].includes(context.status) &&
      context.applicationId === null) ||
    (action === "archive" &&
      ["CANCELLED", "EXPIRED"].includes(context.status));

  if (!allowed) throw new InvalidStateTransitionError();
}
