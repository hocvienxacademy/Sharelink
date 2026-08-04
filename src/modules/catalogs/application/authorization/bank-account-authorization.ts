import type { AuthenticatedActor } from "@/shared/authorization";
import { ForbiddenError, UnauthorizedError } from "@/shared/errors";

export const BANK_ACCOUNT_CAPABILITIES = [
  "bankAccount.list",
  "bankAccount.read",
  "bankAccount.viewHistory",
  "bankAccount.create",
  "bankAccount.update",
  "bankAccount.activate",
  "bankAccount.deactivate",
  "bankAccount.setDefault",
  "bankAccount.clearDefault",
] as const;

export type BankAccountCapability = (typeof BANK_ACCOUNT_CAPABILITIES)[number];
type Decision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: "unauthenticated" | "role-not-allowed" };

export class BankAccountAuthorizationPolicy {
  authorize(capabilityInput: string, actor: AuthenticatedActor | null): Decision {
    if (actor === null) return { allowed: false, reason: "unauthenticated" };
    if (!BANK_ACCOUNT_CAPABILITIES.includes(capabilityInput as BankAccountCapability)) {
      return { allowed: false, reason: "role-not-allowed" };
    }
    const capability = capabilityInput as BankAccountCapability;
    if (capability === "bankAccount.list" || capability === "bankAccount.read") {
      return { allowed: true };
    }
    return actor.role === "ADMIN"
      ? { allowed: true }
      : { allowed: false, reason: "role-not-allowed" };
  }
}

export function assertBankAccountAuthorized(
  policy: BankAccountAuthorizationPolicy,
  capability: BankAccountCapability,
  actor: AuthenticatedActor | null,
): void {
  const decision = policy.authorize(capability, actor);
  if (decision.allowed) return;
  if (decision.reason === "unauthenticated") throw new UnauthorizedError();
  throw new ForbiddenError();
}
