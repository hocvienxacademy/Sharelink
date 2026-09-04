import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import type { StaffIdentity } from "@/modules/auth";
import { createStaffAccountDetailHandler, createStaffAccountMutationHandler } from "./staff-account-handlers";

const identity: StaffIdentity = {
  id: "10000000-0000-4000-8000-000000000010",
  username: "sale",
  fullName: "Test Sale",
  email: "sale@test.invalid",
  role: "SALE",
};
const payload = { expectedRole: "SALE", expectedStatus: "ACTIVE", expectedUpdatedAt: "2026-09-04T00:00:00.000Z", fullName: "Sale Updated" };

function request(origin = "http://localhost") {
  return new NextRequest("http://localhost/api/account", {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: "sls_admin_session=session-token", origin },
    body: JSON.stringify(payload),
  });
}

describe("staff account handlers", () => {
  it("derives the account id from the authenticated session", async () => {
    let receivedId: string | null = null;
    const handler = createStaffAccountDetailHandler(async (_actor, id) => {
      receivedId = id;
      return {
        id, username: identity.username, fullName: identity.fullName, email: identity.email, phone: null,
        role: identity.role, status: "ACTIVE", managerName: null, managerId: null, updatedAt: new Date(),
        lastLoginAt: null, failedLoginAttempts: 0, lockedUntil: null, passwordChangedAt: null, createdAt: new Date(),
      };
    }, async () => identity);
    const response = await handler(new NextRequest("http://localhost/api/account", { headers: { cookie: "sls_admin_session=session-token" } }));
    assert.equal(response.status, 200);
    assert.equal(receivedId, identity.id);
  });

  it("passes only the authenticated actor and request payload to profile mutation", async () => {
    let received: unknown = null;
    const handler = createStaffAccountMutationHandler(async (actor, input, context) => {
      received = { actor, input, requestId: context.requestId };
      return { id: actor.userId, role: actor.role, status: "ACTIVE", updatedAt: new Date("2026-09-04T00:00:01.000Z") };
    }, "staff-account-test", async () => identity);
    const response = await handler(request());
    assert.equal(response.status, 200);
    assert.deepEqual((received as { actor: unknown }).actor, { userId: identity.id, username: identity.username, role: identity.role });
    assert.deepEqual((received as { input: unknown }).input, payload);
  });

  it("rejects cross-origin writes before resolving the session", async () => {
    let calls = 0;
    const handler = createStaffAccountMutationHandler(async () => { calls += 1; throw new Error("unexpected"); }, "staff-account-test", async () => { calls += 1; return identity; });
    const response = await handler(request("https://attacker.invalid"));
    assert.equal(response.status, 400);
    assert.equal(calls, 0);
  });

  it("rate-limits password verification by authenticated account id", async () => {
    let receivedToken: string | null = null;
    const handler = createStaffAccountMutationHandler(
      async (actor) => ({ id: actor.userId, role: actor.role, status: "ACTIVE", updatedAt: new Date() }),
      "staff-password-test",
      async () => identity,
      { endpoint: "account-password", guard: { enforce: async (input) => { receivedToken = input.token; } } },
    );
    const response = await handler(request());
    assert.equal(response.status, 200);
    assert.equal(receivedToken, identity.id);
  });
});
