import type { AuthenticatedActor } from "@/shared/authorization";
import { ForbiddenError, UnauthorizedError } from "@/shared/errors";

export const CATALOG_CAPABILITIES = [
  "catalog.list",
  "catalog.read",
  "catalog.viewHistory",
  "catalog.create",
  "catalog.update",
  "catalog.activate",
  "catalog.deactivate",
] as const;

export type CatalogCapability = (typeof CATALOG_CAPABILITIES)[number];
type Decision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: "unauthenticated" | "role-not-allowed" };

export class CatalogAuthorizationPolicy {
  authorize(capabilityInput: string, actor: AuthenticatedActor | null): Decision {
    if (actor === null) return { allowed: false, reason: "unauthenticated" };
    if (!CATALOG_CAPABILITIES.includes(capabilityInput as CatalogCapability)) {
      return { allowed: false, reason: "role-not-allowed" };
    }
    const capability = capabilityInput as CatalogCapability;
    if (["catalog.list", "catalog.read", "catalog.viewHistory"].includes(capability)) {
      return { allowed: true };
    }
    return actor.role === "ADMIN"
      ? { allowed: true }
      : { allowed: false, reason: "role-not-allowed" };
  }
}

export function assertCatalogAuthorized(
  policy: CatalogAuthorizationPolicy,
  capability: CatalogCapability,
  actor: AuthenticatedActor | null,
): void {
  const decision = policy.authorize(capability, actor);
  if (decision.allowed) return;
  if (decision.reason === "unauthenticated") throw new UnauthorizedError();
  throw new ForbiddenError();
}
