import type { AuthenticatedActor } from "@/shared/authorization";
import { ConflictError, ForbiddenError, UnauthorizedError } from "@/shared/errors";
import type { ApplicationStatus } from "@/modules/applications";
import type { PaymentStatus } from "../../domain/payment";

export const PAYMENT_CAPABILITIES = [
  "payment.list",
  "payment.read",
  "payment.confirm",
  "payment.cancelConfirmation",
  "payment.viewHistory",
] as const;

export type PaymentCapability = (typeof PAYMENT_CAPABILITIES)[number];

export interface PaymentAuthorizationResource {
  readonly applicationStatus: ApplicationStatus;
  readonly ownerId: string;
  readonly ownerManagerId: string | null;
  readonly paymentStatus: PaymentStatus;
}

type PaymentAuthorizationDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: "unauthenticated" | "unknown-capability" | "resource-required" | "outside-scope" | "role-not-allowed" | "invalid-state" };

export class PaymentAuthorizationPolicy {
  authorize(capabilityInput: string, actor: AuthenticatedActor | null, resource?: PaymentAuthorizationResource): PaymentAuthorizationDecision {
    if (actor === null) return { allowed: false, reason: "unauthenticated" };
    if (!PAYMENT_CAPABILITIES.includes(capabilityInput as PaymentCapability)) {
      return { allowed: false, reason: "unknown-capability" };
    }
    const capability = capabilityInput as PaymentCapability;
    if (capability === "payment.list") return { allowed: true };
    if (resource === undefined) return { allowed: false, reason: "resource-required" };
    const inScope = actor.role === "ADMIN"
      || (actor.role === "SALE" && resource.ownerId === actor.userId)
      || (actor.role === "MANAGER" && resource.ownerManagerId === actor.userId);
    if (!inScope) return { allowed: false, reason: "outside-scope" };
    if (capability === "payment.read" || capability === "payment.viewHistory") return { allowed: true };
    if (actor.role === "SALE") return { allowed: false, reason: "role-not-allowed" };
    if (resource.applicationStatus !== "VALID") return { allowed: false, reason: "invalid-state" };
    if (capability === "payment.confirm") {
      return resource.paymentStatus === "PENDING" ? { allowed: true } : { allowed: false, reason: "invalid-state" };
    }
    return resource.paymentStatus === "CONFIRMED" ? { allowed: true } : { allowed: false, reason: "invalid-state" };
  }
}

export function assertPaymentAuthorized(
  policy: PaymentAuthorizationPolicy,
  capability: PaymentCapability,
  actor: AuthenticatedActor | null,
  resource?: PaymentAuthorizationResource,
): void {
  const decision = policy.authorize(capability, actor, resource);
  if (decision.allowed) return;
  if (decision.reason === "unauthenticated") throw new UnauthorizedError();
  if (decision.reason === "invalid-state") throw new ConflictError();
  throw new ForbiddenError();
}

