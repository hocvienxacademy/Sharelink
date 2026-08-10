import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuthenticatedActor } from "@/shared/authorization";
import { ConflictError } from "@/shared/errors";
import { assertStaffApplicationAuthorized, StaffApplicationAuthorizationPolicy } from "./staff-application-authorization";

const sale: AuthenticatedActor = { userId: "sale-1", username: "sale", role: "SALE" };
const manager: AuthenticatedActor = { userId: "manager-1", username: "manager", role: "MANAGER" };
const admin: AuthenticatedActor = { userId: "admin-1", username: "admin", role: "ADMIN" };
const own = { ownerId: sale.userId, ownerManagerId: manager.userId, status: "SUBMITTED" as const };
const outside = { ownerId: "sale-2", ownerManagerId: "manager-2", status: "SUBMITTED" as const };

describe("StaffApplicationAuthorizationPolicy", () => {
  const policy = new StaffApplicationAuthorizationPolicy();

  it("scopes application reads to owner, direct manager, or ADMIN", () => {
    assert.equal(policy.authorize("application.read", sale, own).allowed, true);
    assert.equal(policy.authorize("application.read", sale, outside).allowed, false);
    assert.equal(policy.authorize("application.read", manager, own).allowed, true);
    assert.equal(policy.authorize("application.read", manager, outside).allowed, false);
    assert.equal(policy.authorize("application.read", admin, outside).allowed, true);
  });

  it("uses the same ownership scope for Word exports", () => {
    assert.equal(policy.authorize("application.exportWord", sale, own).allowed, true);
    assert.equal(policy.authorize("application.exportWord", sale, outside).allowed, false);
    assert.equal(policy.authorize("application.exportWord", manager, own).allowed, true);
    assert.equal(policy.authorize("application.exportWord", admin, outside).allowed, true);
  });

  it("keeps SALE read-only for every application mutation", () => {
    for (const capability of ["application.updateContent", "application.requestRevision", "application.validate"] as const) {
      assert.deepEqual(policy.authorize(capability, sale, own), { allowed: false, reason: "role-not-allowed" });
    }
  });

  it("allows scoped MANAGER and ADMIN mutations only in confirmed states", () => {
    for (const status of ["DRAFT", "SUBMITTED", "NEEDS_REVISION"] as const) {
      assert.equal(policy.authorize("application.updateContent", manager, { ...own, status }).allowed, true);
      assert.equal(policy.authorize("application.updateContent", admin, { ...outside, status }).allowed, true);
    }
    assert.deepEqual(policy.authorize("application.updateContent", manager, { ...own, status: "VALID" }), { allowed: false, reason: "invalid-state" });
    assert.equal(policy.authorize("application.requestRevision", manager, own).allowed, true);
    assert.equal(policy.authorize("application.validate", admin, outside).allowed, true);
    assert.deepEqual(policy.authorize("application.validate", manager, { ...own, status: "NEEDS_REVISION" }), { allowed: false, reason: "invalid-state" });
    assert.equal(policy.authorize("application.updateContent", manager, outside).allowed, false);
  });

  it("maps a transition outside the confirmed graph to conflict", () => {
    assert.throws(
      () => assertStaffApplicationAuthorized(policy, "application.validate", manager, { ...own, status: "NEEDS_REVISION" }),
      ConflictError,
    );
  });

  it("denies unknown capabilities and missing resource context", () => {
    assert.equal(policy.authorize("application.delete", admin, own).allowed, false);
    assert.equal(policy.authorize("application.read", admin).allowed, false);
  });
});
