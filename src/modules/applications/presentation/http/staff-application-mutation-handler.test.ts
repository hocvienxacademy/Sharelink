import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import type { StaffIdentity } from "@/modules/auth";
import { ConflictError, ForbiddenError, NotFoundError } from "@/shared/errors";
import { parseStaffUpdateApplication } from "../../application/validation/staff-application-schemas";
import { createStaffApplicationMutationHandler } from "./staff-application-mutation-handler";

const sale: StaffIdentity = { id: "10000000-0000-4000-8000-000000000001", username: "sale", fullName: "Sale", email: "sale@test.invalid", role: "SALE" };
const context = { params: Promise.resolve({ id: "40000000-0000-4000-8000-000000000001" }) };
const request = (origin = "http://localhost", body: unknown = { expectedVersion: 1 }) => new NextRequest("http://localhost/api/admin/applications/40000000-0000-4000-8000-000000000001", { method: "PATCH", headers: { origin, cookie: "sls_admin_session=test", "content-type": "application/json" }, body: JSON.stringify(body) });

describe("staff application mutation HTTP boundary", () => {
  it("maps SALE denial to 403", async () => {
    const handler = createStaffApplicationMutationHandler(async () => { throw new ForbiddenError(); }, "test", async () => sale);
    assert.equal((await handler(request(), context)).status, 403);
  });
  it("returns 401 without session and rejects foreign origin", async () => {
    const operation = async () => ({});
    assert.equal((await createStaffApplicationMutationHandler(operation, "test", async () => null)(request(), context)).status, 401);
    assert.equal((await createStaffApplicationMutationHandler(operation, "test", async () => sale)(request("https://evil.invalid"), context)).status, 400);
  });

  it("returns a safe success DTO without accepting actor or reviewer fields", async () => {
    const handler = createStaffApplicationMutationHandler(async (_actor, _id, input) => {
      const values = parseStaffUpdateApplication(input);
      return { id: "application-1", version: values.expectedVersion + 1 };
    }, "test", async () => sale);
    const response = await handler(request("http://localhost", { expectedVersion: 1, fullName: "Student" }), context);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, data: { id: "application-1", version: 2 } });
    const injected = await handler(request("http://localhost", { expectedVersion: 1, fullName: "Student", role: "ADMIN", reviewerId: sale.id }), context);
    assert.equal(injected.status, 422);
  });

  it("maps validation, missing resource, and concurrency errors", async () => {
    const validating = createStaffApplicationMutationHandler(async (_actor, _id, input) => parseStaffUpdateApplication(input), "test", async () => sale);
    assert.equal((await validating(request("http://localhost", { expectedVersion: 1, status: "VALID" }), context)).status, 422);
    const missing = createStaffApplicationMutationHandler(async () => { throw new NotFoundError("Application"); }, "test", async () => sale);
    assert.equal((await missing(request(), context)).status, 404);
    const conflict = createStaffApplicationMutationHandler(async () => { throw new ConflictError(); }, "test", async () => sale);
    assert.equal((await conflict(request(), context)).status, 409);
  });

  it("sanitizes unexpected infrastructure errors", async () => {
    const handler = createStaffApplicationMutationHandler(async () => { throw new Error("Prisma secret metadata"); }, "test", async () => sale);
    const response = await handler(request(), context);
    assert.equal(response.status, 500);
    assert.equal((await response.text()).includes("Prisma secret metadata"), false);
  });
});
