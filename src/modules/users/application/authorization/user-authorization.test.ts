import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UserAuthorizationPolicy, USER_CAPABILITIES } from "./user-authorization";

const policy = new UserAuthorizationPolicy();
const actor = (role: "SALE" | "MANAGER" | "ADMIN", userId = role.toLowerCase()) => ({ userId, username: userId, role });
const directSale = { id: "sale", role: "SALE" as const, managerId: "manager" };

describe("UserAuthorizationPolicy", () => {
  it("denies every user-management capability to SALE", () => {
    for (const capability of USER_CAPABILITIES) assert.equal(policy.authorize(capability, actor("SALE"), directSale).allowed, false, capability);
  });
  it("allows MANAGER to list/read/history only direct SALEs", () => {
    assert.equal(policy.authorize("user.list", actor("MANAGER")).allowed, true);
    assert.equal(policy.authorize("user.read", actor("MANAGER"), directSale).allowed, true);
    assert.equal(policy.authorize("user.viewHistory", actor("MANAGER"), directSale).allowed, true);
    assert.equal(policy.authorize("user.read", actor("MANAGER", "other"), directSale).allowed, false);
    assert.equal(policy.authorize("user.disable", actor("MANAGER"), directSale).allowed, false);
  });
  it("allows ADMIN all declared capabilities and defaults unknown capabilities to deny", () => {
    for (const capability of USER_CAPABILITIES) {
      const resource = capability === "user.list" || capability === "user.create" ? undefined : directSale;
      assert.equal(policy.authorize(capability, actor("ADMIN"), resource).allowed, true, capability);
    }
    assert.equal(policy.authorize("user.archive", actor("ADMIN"), directSale).allowed, false);
  });
});
