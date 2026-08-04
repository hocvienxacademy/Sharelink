import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import type { AdminIdentity } from "@/modules/auth";
import type { CreatedUser } from "../../domain/user";
import { createCreateAdminUserHandler, createUserMutationHandler } from "./admin-user-handlers";

const identity: AdminIdentity = {
  id: "10000000-0000-4000-8000-000000000002",
  username: "admin",
  fullName: "Test Admin",
  email: "admin@test.invalid",
  role: "ADMIN",
};

const input = {
  fullName: "Test Sale",
  username: "sale-new",
  email: "sale-new@test.invalid",
  phone: null,
  role: "SALE",
  password: "password-123",
};

function request(origin = "http://localhost"): NextRequest {
  return new NextRequest("http://localhost/api/admin/users", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: "sls_admin_session=session-token",
      origin,
    },
    body: JSON.stringify(input),
  });
}

describe("createCreateAdminUserHandler", () => {
  it("returns 401 without an active ADMIN session", async () => {
    let serviceCalls = 0;
    const handler = createCreateAdminUserHandler(
      { execute: async () => { serviceCalls += 1; throw new Error("unexpected"); } },
      async () => null,
    );

    const response = await handler(request());
    assert.equal(response.status, 401);
    assert.equal(serviceCalls, 0);
  });

  it("rejects cross-origin writes before resolving the session", async () => {
    let identityCalls = 0;
    const handler = createCreateAdminUserHandler(
      { execute: async () => { throw new Error("unexpected"); } },
      async () => { identityCalls += 1; return identity; },
    );

    const response = await handler(request("https://attacker.invalid"));
    assert.equal(response.status, 400);
    assert.equal(identityCalls, 0);
  });

  it("returns 403 for an authenticated non-ADMIN staff session", async () => {
    let serviceCalls = 0;
    const handler = createCreateAdminUserHandler(
      { execute: async () => { serviceCalls += 1; throw new Error("unexpected"); } },
      async () => ({ ...identity, role: "SALE" }),
    );
    const response = await handler(request());
    assert.equal(response.status, 403);
    assert.equal(serviceCalls, 0);
  });

  it("creates a safe account DTO for an authenticated ADMIN", async () => {
    let actorId: string | null = null;
    let receivedInput: unknown;
    const created: CreatedUser = {
      id: "10000000-0000-4000-8000-000000000099",
    };
    const handler = createCreateAdminUserHandler(
      {
        execute: async (actor, payload) => {
          actorId = actor.userId;
          receivedInput = payload;
          return created;
        },
      },
      async () => identity,
    );

    const response = await handler(request());
    assert.equal(response.status, 201);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(actorId, identity.id);
    assert.deepEqual(receivedInput, input);
    const body = await response.json();
    assert.deepEqual(body, { success: true, data: created });
    assert.equal(JSON.stringify(body).includes(input.password), false);
  });
});

describe("createUserMutationHandler", () => {
  const userId = "10000000-0000-4000-8000-000000000099";
  const payload = { expectedRole: "SALE", expectedStatus: "ACTIVE", expectedUpdatedAt: "2026-08-04T00:00:00.000Z" };
  const mutationRequest = (origin = "http://localhost") => new NextRequest(`http://localhost/api/admin/users/${userId}/disable`, {
    method: "POST", headers: { "content-type": "application/json", cookie: "sls_admin_session=session-token", origin }, body: JSON.stringify(payload),
  });

  it("passes a safe actor, validated route id and correlation context to the use case", async () => {
    let received: unknown = null;
    const handler = createUserMutationHandler(async (actor, id, input, context) => {
      received = { actor, id, input, requestId: context.requestId };
      return { id, role: "SALE", status: "DISABLED", updatedAt: new Date("2026-08-04T00:00:01.000Z") };
    }, "test-user-disable", async () => identity);
    const response = await handler(mutationRequest(), { params: Promise.resolve({ id: userId }) });
    assert.equal(response.status, 200);
    assert.deepEqual((received as { actor: unknown; id: string; input: unknown }).actor, { userId: identity.id, username: identity.username, role: identity.role });
    assert.equal((received as { id: string }).id, userId);
    assert.deepEqual((received as { input: unknown }).input, payload);
    assert.match((received as { requestId: string }).requestId, /^[0-9a-f-]{36}$/);
  });

  it("rejects cross-origin mutations before resolving identity or invoking the use case", async () => {
    let calls = 0;
    const handler = createUserMutationHandler(async () => { calls += 1; throw new Error("unexpected"); }, "test-user-disable", async () => { calls += 1; return identity; });
    const response = await handler(mutationRequest("https://attacker.invalid"), { params: Promise.resolve({ id: userId }) });
    assert.equal(response.status, 400);
    assert.equal(calls, 0);
  });
});
