import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UserAuthorizationPolicy, USER_CAPABILITIES } from "./user-authorization";

const policy = new UserAuthorizationPolicy();
const actor = (role: "SALE" | "MANAGER" | "ADMIN", userId = role.toLowerCase()) => ({ userId, username: userId, role });
const directSale = { id: "sale", role: "SALE" as const, managerId: "manager" };

describe("UserAuthorizationPolicy", () => {
  it("allows SALE to manage only their own profile and password", () => {
    const sale = actor("SALE");
    const ownAccount = { id: sale.userId, role: "SALE" as const, managerId: "manager" };
    assert.equal(policy.authorize("user.read", sale, ownAccount).allowed, true);
    assert.equal(policy.authorize("user.updateProfile", sale, ownAccount).allowed, true);
    assert.equal(policy.authorize("user.changeOwnPassword", sale, ownAccount).allowed, true);
    assert.equal(policy.authorize("user.read", sale, directSale).allowed, true);
    for (const capability of ["user.list", "user.listManagerOptions", "user.changeRole", "user.assignManager", "user.disable"] as const) {
      assert.equal(policy.authorize(capability, sale, ownAccount).allowed, false, capability);
    }
  });
  it("allows MANAGER to list/read/history only direct SALEs", () => {
    assert.equal(policy.authorize("user.list", actor("MANAGER")).allowed, true);
    assert.equal(policy.authorize("user.read", actor("MANAGER"), directSale).allowed, true);
    assert.equal(policy.authorize("user.viewHistory", actor("MANAGER"), directSale).allowed, true);
    assert.equal(policy.authorize("user.read", actor("MANAGER", "other"), directSale).allowed, false);
    assert.equal(policy.authorize("user.disable", actor("MANAGER"), directSale).allowed, false);
    assert.equal(policy.authorize("user.listManagerOptions", actor("MANAGER")).allowed, false);
    const manager = actor("MANAGER");
    const ownAccount = { id: manager.userId, role: "MANAGER" as const, managerId: null };
    assert.equal(policy.authorize("user.updateProfile", manager, ownAccount).allowed, true);
    assert.equal(policy.authorize("user.changeOwnPassword", manager, ownAccount).allowed, true);
  });
  it("allows ADMIN all declared capabilities and defaults unknown capabilities to deny", () => {
    for (const capability of USER_CAPABILITIES) {
      const resource = capability === "user.list" || capability === "user.listManagerOptions" || capability === "user.create" ? undefined : directSale;
      assert.equal(policy.authorize(capability, actor("ADMIN"), resource).allowed, true, capability);
    }
    assert.equal(policy.authorize("user.archive", actor("ADMIN"), directSale).allowed, false);
  });
});
