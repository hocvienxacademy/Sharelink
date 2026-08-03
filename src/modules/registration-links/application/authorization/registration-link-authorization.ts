import { ForbiddenError, UnauthorizedError } from "@/shared/errors";
import type { AuthenticatedActor } from "@/shared/authorization";
import type { RegistrationLinkStatus } from "../../domain/registration-link";

export const ADMIN_CAPABILITIES = [
  "registrationLink.list",
  "registrationLink.read",
  "registrationLink.create",
  "registrationLink.updateDetails",
  "registrationLink.activate",
  "registrationLink.lock",
  "registrationLink.unlock",
  "registrationLink.cancel",
  "registrationLink.archive",
  "registrationLink.viewHistory",
  "registrationLink.copyPublicUrl",
] as const;

export type AdminCapability = (typeof ADMIN_CAPABILITIES)[number];
export type AuthorizationDenialReason =
  | "unauthenticated"
  | "unknown-capability"
  | "role-not-allowed"
  | "resource-required"
  | "outside-scope";

export type AuthorizationDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: AuthorizationDenialReason };

export interface RegistrationLinkAuthorizationResource {
  readonly ownerId: string;
  readonly ownerManagerId: string | null;
  readonly status: RegistrationLinkStatus;
}

export interface AuthorizationContext {
  readonly actor: AuthenticatedActor | null;
  readonly resource?: RegistrationLinkAuthorizationResource;
}

export function isRegistrationLinkMutationOwner(
  actor: AuthenticatedActor,
  ownerId: string,
): boolean {
  return actor.role === "ADMIN" || (actor.role === "SALE" && actor.userId === ownerId);
}

const READ_CAPABILITIES = new Set<AdminCapability>([
  "registrationLink.read",
  "registrationLink.viewHistory",
  "registrationLink.copyPublicUrl",
]);

export class RegistrationLinkAuthorizationPolicy {
  authorize(capabilityInput: string, context: AuthorizationContext): AuthorizationDecision {
    if (context.actor === null) return { allowed: false, reason: "unauthenticated" };
    if (!ADMIN_CAPABILITIES.includes(capabilityInput as AdminCapability)) {
      return { allowed: false, reason: "unknown-capability" };
    }
    const capability = capabilityInput as AdminCapability;

    if (capability === "registrationLink.list") return { allowed: true };
    if (capability === "registrationLink.create") {
      return context.actor.role === "ADMIN" || context.actor.role === "SALE"
        ? { allowed: true }
        : { allowed: false, reason: "role-not-allowed" };
    }

    if (READ_CAPABILITIES.has(capability)) {
      if (context.resource === undefined) {
        return { allowed: false, reason: "resource-required" };
      }
      if (
        capability === "registrationLink.copyPublicUrl" &&
        context.resource.status !== "ACTIVE"
      ) return { allowed: false, reason: "role-not-allowed" };
      if (context.actor.role === "ADMIN") return { allowed: true };
      if (
        context.actor.role === "SALE" &&
        context.resource.ownerId === context.actor.userId
      ) return { allowed: true };
      if (
        context.actor.role === "MANAGER" &&
        context.resource.ownerManagerId === context.actor.userId
      ) return { allowed: true };
      return { allowed: false, reason: "outside-scope" };
    }

    if (context.resource === undefined) {
      return { allowed: false, reason: "resource-required" };
    }
    if (isRegistrationLinkMutationOwner(context.actor, context.resource.ownerId)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: context.actor.role === "MANAGER" ? "role-not-allowed" : "outside-scope",
    };
  }
}

export function assertRegistrationLinkAuthorized(
  policy: RegistrationLinkAuthorizationPolicy,
  capability: AdminCapability,
  context: AuthorizationContext,
): void {
  const decision = policy.authorize(capability, context);
  if (decision.allowed) return;
  if (decision.reason === "unauthenticated") throw new UnauthorizedError();
  throw new ForbiddenError();
}
