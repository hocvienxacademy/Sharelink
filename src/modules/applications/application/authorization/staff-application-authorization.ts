import type { AuthenticatedActor } from "@/shared/authorization";
import { ConflictError, ForbiddenError, UnauthorizedError } from "@/shared/errors";

export const STAFF_APPLICATION_CAPABILITIES = [
  "application.list",
  "application.read",
  "application.exportWord",
  "application.updateContent",
  "application.requestRevision",
  "application.validate",
  "application.viewHistory",
] as const;

export type StaffApplicationCapability = (typeof STAFF_APPLICATION_CAPABILITIES)[number];

export interface StaffApplicationAuthorizationResource {
  readonly ownerId: string;
  readonly ownerManagerId: string | null;
  readonly status: import("../../domain/application").ApplicationStatus;
}

type Decision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: "unauthenticated" | "role-not-allowed" | "resource-required" | "outside-scope" | "invalid-state" };

export class StaffApplicationAuthorizationPolicy {
  authorize(
    capabilityInput: string,
    actor: AuthenticatedActor | null,
    resource?: StaffApplicationAuthorizationResource,
  ): Decision {
    if (actor === null) return { allowed: false, reason: "unauthenticated" };
    if (!STAFF_APPLICATION_CAPABILITIES.includes(capabilityInput as StaffApplicationCapability)) {
      return { allowed: false, reason: "role-not-allowed" };
    }
    const capability = capabilityInput as StaffApplicationCapability;
    if (capability === "application.list") return { allowed: true };
    if (resource === undefined) return { allowed: false, reason: "resource-required" };
    const inScope = actor.role === "ADMIN" ||
      (actor.role === "SALE" && resource.ownerId === actor.userId) ||
      (actor.role === "MANAGER" && resource.ownerManagerId === actor.userId);
    if (!inScope) return { allowed: false, reason: "outside-scope" };
    if (capability === "application.read" || capability === "application.exportWord" || capability === "application.viewHistory") return { allowed: true };
    if (actor.role === "SALE") return { allowed: false, reason: "role-not-allowed" };
    if (capability === "application.updateContent") {
      return ["DRAFT", "SUBMITTED", "NEEDS_REVISION"].includes(resource.status)
        ? { allowed: true } : { allowed: false, reason: "invalid-state" };
    }
    return resource.status === "SUBMITTED"
      ? { allowed: true } : { allowed: false, reason: "invalid-state" };
  }
}

export function assertStaffApplicationAuthorized(
  policy: StaffApplicationAuthorizationPolicy,
  capability: StaffApplicationCapability,
  actor: AuthenticatedActor | null,
  resource?: StaffApplicationAuthorizationResource,
): void {
  const decision = policy.authorize(capability, actor, resource);
  if (decision.allowed) return;
  if (decision.reason === "unauthenticated") throw new UnauthorizedError();
  if (decision.reason === "invalid-state") throw new ConflictError();
  throw new ForbiddenError();
}
