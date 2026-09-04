import type { AuthenticatedActor } from "@/shared/authorization";
import { ForbiddenError, UnauthorizedError } from "@/shared/errors";
import type { UserRole } from "../../domain/user";

export const USER_CAPABILITIES = [
  "user.list", "user.listManagerOptions", "user.read", "user.viewHistory", "user.create", "user.updateProfile",
  "user.changeRole", "user.assignManager", "user.disable", "user.enable",
  "user.unlockSecurity", "user.resetPassword", "user.revokeSessions",
  "user.changeOwnPassword",
] as const;
export type UserCapability = (typeof USER_CAPABILITIES)[number];
export interface UserAuthorizationResource { readonly id: string; readonly role: UserRole; readonly managerId: string | null }
type Decision = { readonly allowed: true } | { readonly allowed: false; readonly reason: "unauthenticated" | "role-not-allowed" | "resource-required" | "outside-scope" };

export class UserAuthorizationPolicy {
  authorize(capabilityInput: string, actor: AuthenticatedActor | null, resource?: UserAuthorizationResource): Decision {
    if (actor === null) return { allowed: false, reason: "unauthenticated" };
    if (!USER_CAPABILITIES.includes(capabilityInput as UserCapability)) return { allowed: false, reason: "role-not-allowed" };
    const capability = capabilityInput as UserCapability;
    if (actor.role === "ADMIN") {
      const requiresResource = !["user.list", "user.listManagerOptions", "user.create"].includes(capability);
      return requiresResource && resource === undefined
        ? { allowed: false, reason: "resource-required" }
        : { allowed: true };
    }
    if ((capability === "user.read" || capability === "user.updateProfile" || capability === "user.changeOwnPassword") && resource?.id === actor.userId) {
      return { allowed: true };
    }
    if (actor.role === "MANAGER" && (capability === "user.list" || capability === "user.read" || capability === "user.viewHistory")) {
      if (capability === "user.list") return { allowed: true };
      if (resource === undefined) return { allowed: false, reason: "resource-required" };
      return resource.role === "SALE" && resource.managerId === actor.userId
        ? { allowed: true }
        : { allowed: false, reason: "outside-scope" };
    }
    return { allowed: false, reason: "role-not-allowed" };
  }
}

export function assertUserAuthorized(policy: UserAuthorizationPolicy, capability: UserCapability, actor: AuthenticatedActor | null, resource?: UserAuthorizationResource): void {
  const decision = policy.authorize(capability, actor, resource);
  if (decision.allowed) return;
  if (decision.reason === "unauthenticated") throw new UnauthorizedError();
  throw new ForbiddenError();
}
