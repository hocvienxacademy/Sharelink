import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuthenticatedActor } from "@/shared/authorization";
import { ConflictError, ForbiddenError, UnauthorizedError } from "@/shared/errors";
import { PaymentAuthorizationPolicy, assertPaymentAuthorized, type PaymentAuthorizationResource } from "./payment-authorization";

const admin: AuthenticatedActor = { userId: "admin", username: "admin", role: "ADMIN" };
const manager: AuthenticatedActor = { userId: "manager", username: "manager", role: "MANAGER" };
const sale: AuthenticatedActor = { userId: "sale", username: "sale", role: "SALE" };
const resource = (overrides: Partial<PaymentAuthorizationResource> = {}): PaymentAuthorizationResource => ({
  applicationStatus: "VALID",
  ownerId: sale.userId,
  ownerManagerId: manager.userId,
  paymentStatus: "PENDING",
  ...overrides,
});

describe("PaymentAuthorizationPolicy", () => {
  const policy = new PaymentAuthorizationPolicy();

  it("allows scoped reads for all three staff roles", () => {
    assert.deepEqual(policy.authorize("payment.read", admin, resource()), { allowed: true });
    assert.deepEqual(policy.authorize("payment.read", manager, resource()), { allowed: true });
    assert.deepEqual(policy.authorize("payment.read", sale, resource()), { allowed: true });
  });

  it("keeps SALE read-only and manager mutations inside direct-report scope", () => {
    assert.throws(() => assertPaymentAuthorized(policy, "payment.confirm", sale, resource()), ForbiddenError);
    assert.throws(() => assertPaymentAuthorized(policy, "payment.confirm", manager, resource({ ownerManagerId: "other" })), ForbiddenError);
    assert.doesNotThrow(() => assertPaymentAuthorized(policy, "payment.confirm", manager, resource()));
  });

  it("maps application and payment state violations to conflict", () => {
    assert.throws(() => assertPaymentAuthorized(policy, "payment.confirm", admin, resource({ applicationStatus: "SUBMITTED" })), ConflictError);
    assert.throws(() => assertPaymentAuthorized(policy, "payment.confirm", admin, resource({ paymentStatus: "CONFIRMED" })), ConflictError);
    assert.throws(() => assertPaymentAuthorized(policy, "payment.cancelConfirmation", admin, resource({ paymentStatus: "CANCELLED" })), ConflictError);
  });

  it("rejects an unauthenticated actor", () => {
    assert.throws(() => assertPaymentAuthorized(policy, "payment.list", null), UnauthorizedError);
  });
});
