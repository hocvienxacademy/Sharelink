import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuthenticatedActor } from "@/shared/authorization";
import { StaffApplicationAuthorizationPolicy } from "./authorization/staff-application-authorization";
import { staffUpdateApplicationFeeSchema } from "./validation/staff-application-schemas";

const owner: AuthenticatedActor = {
  userId: "10000000-0000-4000-8000-000000000001",
  username: "sale.owner",
  role: "SALE",
};

const resource = {
  ownerId: owner.userId,
  ownerManagerId: "20000000-0000-4000-8000-000000000001",
  status: "DRAFT" as const,
};

describe("application fee authorization", () => {
  const policy = new StaffApplicationAuthorizationPolicy();

  it("allows the assigned SALE to update the fee in any application state", () => {
    assert.deepEqual(
      policy.authorize("application.updateFee", owner, resource),
      { allowed: true },
    );
  });

  it("rejects another SALE and non-SALE roles", () => {
    assert.equal(policy.authorize("application.updateFee", {
      ...owner,
      userId: "30000000-0000-4000-8000-000000000001",
    }, resource).allowed, false);
    assert.equal(policy.authorize("application.updateFee", {
      ...owner,
      role: "MANAGER",
      userId: resource.ownerManagerId,
    }, resource).allowed, false);
    assert.equal(policy.authorize("application.updateFee", {
      ...owner,
      role: "ADMIN",
    }, resource).allowed, false);
  });
});

describe("application fee validation", () => {
  it("trims an optional reason for a fee that has not been transferred", () => {
    const result = staffUpdateApplicationFeeSchema.parse({
      expectedVersion: 1,
      status: "NOT_TRANSFERRED",
      reason: "  Sinh viên chưa hoàn tất giao dịch.  ",
    });
    assert.equal(result.reason, "Sinh viên chưa hoàn tất giao dịch.");
  });

  it("normalizes an omitted reason to null", () => {
    const result = staffUpdateApplicationFeeSchema.parse({
      expectedVersion: 1,
      status: "NOT_TRANSFERRED",
    });
    assert.equal(result.reason, null);
  });

  it("requires a transferred fee to have no reason", () => {
    assert.equal(staffUpdateApplicationFeeSchema.safeParse({
      expectedVersion: 1,
      status: "TRANSFERRED",
      reason: "Lý do cũ",
    }).success, false);
    assert.equal(staffUpdateApplicationFeeSchema.safeParse({
      expectedVersion: 1,
      status: "TRANSFERRED",
      reason: null,
    }).success, true);
  });

  it("rejects HTML and reasons longer than the database contract", () => {
    assert.equal(staffUpdateApplicationFeeSchema.safeParse({
      expectedVersion: 1,
      status: "NOT_TRANSFERRED",
      reason: "<strong>Không hợp lệ</strong>",
    }).success, false);
    assert.equal(staffUpdateApplicationFeeSchema.safeParse({
      expectedVersion: 1,
      status: "NOT_TRANSFERRED",
      reason: "a".repeat(2001),
    }).success, false);
  });
});
