import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { ForbiddenError } from "@/shared/errors";
import type { StaffIdentity } from "@/modules/auth";
import { createCatalogCreateHandler, createCatalogHistoryHandler, createCatalogListHandler, createCatalogMutationHandler } from "./admin-catalog-handlers";

const identity: StaffIdentity = { id: "10000000-0000-4000-8000-000000000001", username: "admin", fullName: "Admin", email: "admin@test.invalid", role: "ADMIN" };
const id = "20000000-0000-4000-8000-000000000001";
const request = (path: string, method: "GET" | "POST" | "PATCH", body?: unknown, origin = "http://localhost") => new NextRequest(`http://localhost${path}`, {
  method, headers: { cookie: "sls_admin_session=test", origin, ...(body === undefined ? {} : { "content-type": "application/json" }) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const context = { params: Promise.resolve({ id }) };

describe("admin catalog HTTP handlers", () => {
  it("requires authentication and same-origin mutations", async () => {
    const create = createCatalogCreateHandler(async () => ({ id }), "catalog-test", async () => null);
    assert.equal((await create(request("/api/admin/majors", "POST", {}))).status, 401);
    const crossSite = createCatalogCreateHandler(async () => ({ id }), "catalog-test", async () => identity);
    assert.equal((await crossSite(request("/api/admin/majors", "POST", {}, "https://evil.invalid"))).status, 400);
  });

  it("passes actor, id, payload and correlation context without trusting client identity", async () => {
    const handler = createCatalogMutationHandler(async (actor, entityId, input, mutationContext) => {
      assert.equal(actor.userId, identity.id); assert.equal(entityId, id);
      assert.deepEqual(input, { expectedUpdatedAt: "2026-08-04T00:00:00.000Z" });
      assert.notEqual(mutationContext.requestId, ""); return { id: entityId };
    }, "catalog-test", async () => identity);
    const response = await handler(request(`/api/admin/majors/${id}`, "PATCH", { expectedUpdatedAt: "2026-08-04T00:00:00.000Z" }), context);
    assert.equal(response.status, 200);
  });

  it("supports safe list/history reads and maps authorization failures", async () => {
    const list = createCatalogListHandler(async (actor) => [{ id: actor.userId }], async () => identity);
    assert.equal((await list(request("/api/admin/majors", "GET"))).status, 200);
    const history = createCatalogHistoryHandler("majors", async (_actor, entityType, entityId) => [{ id: entityId, action: entityType, actorName: null, occurredAt: new Date() }], async () => identity);
    assert.equal((await history(request(`/api/admin/majors/${id}/history`, "GET"), context)).status, 200);
    const denied = createCatalogListHandler(async () => { throw new ForbiddenError(); }, async () => identity);
    assert.equal((await denied(request("/api/admin/majors", "GET"))).status, 403);
  });
});
