import type { AuthenticatedActor } from "@/shared/authorization";
import { ForbiddenError, UnauthorizedError } from "@/shared/errors";

export const STAFF_APPLICATION_CAPABILITIES = [
  "application.list",
  "application.read",
  "application.updateDetails",
] as const;

export type StaffApplicationCapability = (typeof STAFF_APPLICATION_CAPABILITIES)[number];

export interface StaffApplicationAuthorizationResource {
  readonly ownerId: string;
  readonly ownerManagerId: string | null;
}

type Decision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: "unauthenticated" | "role-not-allowed" | "resource-required" | "outside-scope" };

export class StaffApplicationAuthorizationPolicy {
  authorize(
    capability: StaffApplicationCapability,
    actor: AuthenticatedActor | null,
    resource?: StaffApplicationAuthorizationResource,
  ): Decision {
    if (actor === null) return { allowed: false, reason: "unauthenticated" };
    if (capability === "application.list") return { allowed: true };
    if (capability === "application.updateDetails") {
      return { allowed: false, reason: "role-not-allowed" };
    }
    if (resource === undefined) return { allowed: false, reason: "resource-required" };
    if (actor.role === "ADMIN") return { allowed: true };
    if (actor.role === "SALE" && resource.ownerId === actor.userId) return { allowed: true };
    if (actor.role === "MANAGER" && resource.ownerManagerId === actor.userId) return { allowed: true };
    return { allowed: false, reason: "outside-scope" };
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
  throw new ForbiddenError();
}
