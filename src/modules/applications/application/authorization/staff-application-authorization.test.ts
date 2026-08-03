import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuthenticatedActor } from "@/shared/authorization";
import { StaffApplicationAuthorizationPolicy } from "./staff-application-authorization";

const sale: AuthenticatedActor = { userId: "sale-1", username: "sale", role: "SALE" };
const manager: AuthenticatedActor = { userId: "manager-1", username: "manager", role: "MANAGER" };
const admin: AuthenticatedActor = { userId: "admin-1", username: "admin", role: "ADMIN" };
const own = { ownerId: sale.userId, ownerManagerId: manager.userId };
const outside = { ownerId: "sale-2", ownerManagerId: "manager-2" };

describe("StaffApplicationAuthorizationPolicy", () => {
  const policy = new StaffApplicationAuthorizationPolicy();

  it("scopes application reads to owner, direct manager, or ADMIN", () => {
    assert.equal(policy.authorize("application.read", sale, own).allowed, true);
    assert.equal(policy.authorize("application.read", sale, outside).allowed, false);
    assert.equal(policy.authorize("application.read", manager, own).allowed, true);
    assert.equal(policy.authorize("application.read", manager, outside).allowed, false);
    assert.equal(policy.authorize("application.read", admin, outside).allowed, true);
  });

  it("denies SALE application updates even for their own DRAFT application", () => {
    assert.deepEqual(policy.authorize("application.updateDetails", sale, own), {
      allowed: false,
      reason: "role-not-allowed",
    });
    assert.equal(policy.authorize("application.updateDetails", manager, own).allowed, false);
    assert.equal(policy.authorize("application.updateDetails", admin, own).allowed, false);
  });
});
