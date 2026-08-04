import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import type { StaffIdentity } from "@/modules/auth";
import { ForbiddenError } from "@/shared/errors";
import {
  createBankAccountCreateHandler,
  createBankAccountHistoryHandler,
  createBankAccountListHandler,
  createBankAccountMutationHandler,
} from "./admin-bank-account-handlers";

const identity: StaffIdentity = { id: "10000000-0000-4000-8000-000000000001", username: "admin", fullName: "Admin", email: "admin@test.invalid", role: "ADMIN" };
const id = "20000000-0000-4000-8000-000000000001";
const request = (method: "GET" | "POST" | "PATCH", body?: unknown, origin = "http://localhost") => new NextRequest(`http://localhost/api/admin/bank-accounts/${id}`, {
  method, headers: { cookie: "sls_admin_session=test", origin, ...(body === undefined ? {} : { "content-type": "application/json" }) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const context = { params: Promise.resolve({ id }) };

describe("bank account HTTP handlers", () => {
  it("requires authentication and rejects cross-origin writes before the operation", async () => {
    let called = false;
    const unauthenticated = createBankAccountCreateHandler(async () => { called = true; return { id }; }, async () => null);
    assert.equal((await unauthenticated(request("POST", {}))).status, 401);
    const crossOrigin = createBankAccountCreateHandler(async () => { called = true; return { id }; }, async () => identity);
    assert.equal((await crossOrigin(request("POST", {}, "https://evil.invalid"))).status, 400);
    assert.equal(called, false);
  });

  it("passes only server identity, validated id, payload and correlation context", async () => {
    const handler = createBankAccountMutationHandler(async (actor, entityId, input, mutationContext) => {
      assert.equal(actor.userId, identity.id);
      assert.equal(entityId, id);
      assert.deepEqual(input, { expectedUpdatedAt: "2026-08-04T00:00:00.000Z" });
      assert.notEqual(mutationContext.requestId, "");
      return { id: entityId };
    }, "bank-test", async () => identity);
    assert.equal((await handler(request("PATCH", { expectedUpdatedAt: "2026-08-04T00:00:00.000Z" }), context)).status, 200);
  });

  it("supports safe reads and maps authorization failures", async () => {
    const list = createBankAccountListHandler(async (actor) => [{ id: actor.userId }], async () => identity);
    assert.equal((await list(request("GET"))).status, 200);
    const history = createBankAccountHistoryHandler(async () => [{ id, action: "BANK_ACCOUNT_CREATED", actorName: null, occurredAt: new Date() }], async () => identity);
    assert.equal((await history(request("GET"), context)).status, 200);
    const denied = createBankAccountListHandler(async () => { throw new ForbiddenError(); }, async () => identity);
    assert.equal((await denied(request("GET"))).status, 403);
  });
});
