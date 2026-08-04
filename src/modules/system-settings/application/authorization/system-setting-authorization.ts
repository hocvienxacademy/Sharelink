import type { AuthenticatedActor } from "@/shared/authorization";
import { ForbiddenError, UnauthorizedError } from "@/shared/errors";

export const SYSTEM_SETTING_CAPABILITIES = [
  "systemSetting.list",
  "systemSetting.update",
  "systemSetting.viewHistory",
] as const;
export type SystemSettingCapability = (typeof SYSTEM_SETTING_CAPABILITIES)[number];
type Decision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: "unauthenticated" | "role-not-allowed" };

export class SystemSettingAuthorizationPolicy {
  authorize(capabilityInput: string, actor: AuthenticatedActor | null): Decision {
    if (actor === null) return { allowed: false, reason: "unauthenticated" };
    if (!SYSTEM_SETTING_CAPABILITIES.includes(capabilityInput as SystemSettingCapability)) {
      return { allowed: false, reason: "role-not-allowed" };
    }
    return actor.role === "ADMIN"
      ? { allowed: true }
      : { allowed: false, reason: "role-not-allowed" };
  }
}

export function assertSystemSettingAuthorized(
  policy: SystemSettingAuthorizationPolicy,
  capability: SystemSettingCapability,
  actor: AuthenticatedActor | null,
): void {
  const decision = policy.authorize(capability, actor);
  if (decision.allowed) return;
  if (decision.reason === "unauthenticated") throw new UnauthorizedError();
  throw new ForbiddenError();
}
