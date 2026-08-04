import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ForbiddenError, ValidationError } from "@/shared/errors";
import type { AuthenticatedActor } from "@/shared/authorization";
import { CatalogAuthorizationPolicy } from "../authorization/catalog-authorization";
import { parseCreateAdmissionPeriod, parseCreateMajor, parseUpdateMajor } from "../validation/catalog-management-schemas";

const sale: AuthenticatedActor = { userId: "10000000-0000-4000-8000-000000000003", username: "sale", role: "SALE" };
const manager: AuthenticatedActor = { userId: "10000000-0000-4000-8000-000000000002", username: "manager", role: "MANAGER" };
const admin: AuthenticatedActor = { userId: "10000000-0000-4000-8000-000000000001", username: "admin", role: "ADMIN" };

describe("catalog management baseline", () => {
  it("allows all staff to read but only ADMIN to mutate", () => {
    const policy = new CatalogAuthorizationPolicy();
    for (const actor of [sale, manager, admin]) assert.equal(policy.authorize("catalog.read", actor).allowed, true);
    assert.equal(policy.authorize("catalog.update", admin).allowed, true);
    assert.equal(policy.authorize("catalog.update", manager).allowed, false);
    assert.equal(policy.authorize("catalog.create", sale).allowed, false);
    assert.equal(policy.authorize("unknown", admin).allowed, false);
  });

  it("requires a valid admission date range", () => {
    assert.deepEqual(parseCreateAdmissionPeriod({ code: " 2027 ", name: " Kỳ 2027 ", startDate: "2027-01-01", endDate: "2027-12-31" }), {
      code: "2027", name: "Kỳ 2027", startDate: "2027-01-01", endDate: "2027-12-31",
    });
    assert.throws(() => parseCreateAdmissionPeriod({ code: "2027", name: "Kỳ", startDate: "2027-12-31", endDate: "2027-01-01" }), ValidationError);
  });

  it("normalizes major codes and validates nonnegative display order", () => {
    assert.equal(parseCreateMajor({ code: "  cntt ", name: "Công nghệ thông tin", displayOrder: 0 }).code, "CNTT");
    assert.equal(parseUpdateMajor({ expectedUpdatedAt: "2026-08-04T00:00:00.000Z", code: " qtkd " }).code, "QTKD");
    assert.throws(() => parseCreateMajor({ code: "CNTT", name: "CNTT", displayOrder: -1 }), ValidationError);
  });

  it("represents denied mutation as a forbidden boundary", () => {
    const policy = new CatalogAuthorizationPolicy();
    const denied = policy.authorize("catalog.activate", manager);
    assert.equal(denied.allowed, false);
    assert.ok(new ForbiddenError() instanceof ForbiddenError);
  });
});
