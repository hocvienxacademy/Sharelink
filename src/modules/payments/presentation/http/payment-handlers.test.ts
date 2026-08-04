import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import type { StaffIdentity } from "@/modules/auth";
import { ConflictError, ForbiddenError, NotFoundError } from "@/shared/errors";
import { parseConfirmPayment } from "../../application/validation/payment-schemas";
import { createPaymentMutationHandler, createPaymentQueryHandler } from "./payment-handlers";

const applicationId = "40000000-0000-4000-8000-000000000001";
const identity: StaffIdentity = {
  id: "10000000-0000-4000-8000-000000000003", username: "manager", fullName: "Manager",
  email: "manager@test.invalid", role: "MANAGER",
};
const context = { params: Promise.resolve({ id: applicationId }) };
const body = { expectedStatus: "PENDING", expectedUpdatedAt: "2026-08-04T08:00:00.000Z", confirmationNote: "received" };
const request = (origin = "http://localhost", payload: unknown = body) => new NextRequest(`http://localhost/api/admin/applications/${applicationId}/payment/confirm`, {
  method: "POST", headers: { origin, cookie: "sls_admin_session=test", "content-type": "application/json" }, body: JSON.stringify(payload),
});

describe("payment HTTP handlers", () => {
  it("requires a session and same-origin mutation", async () => {
    const operation = async () => ({});
    assert.equal((await createPaymentMutationHandler(operation, "test", async () => null)(request(), context)).status, 401);
    assert.equal((await createPaymentMutationHandler(operation, "test", async () => identity)(request("https://evil.invalid"), context)).status, 400);
  });

  it("derives actor and request ID server-side and rejects client-owned payment fields", async () => {
    let capturedRole: string | null = null;
    let capturedRequestId: string | null = null;
    const handler = createPaymentMutationHandler(async (actor, id, input, requestId) => {
      capturedRole = actor.role;
      capturedRequestId = requestId;
      const values = parseConfirmPayment(input);
      return { applicationId: id, note: values.confirmationNote };
    }, "test", async () => identity);
    const response = await handler(request(), context);
    assert.equal(response.status, 200);
    assert.equal(capturedRole, "MANAGER");
    assert.match(capturedRequestId ?? "", /^[0-9a-f-]{36}$/u);
    assert.equal((await handler(request("http://localhost", { ...body, amount: "2500000", confirmedBy: identity.id }), context)).status, 422);
  });

  it("maps authorization, missing, conflict and infrastructure errors safely", async () => {
    const cases = [
      [new ForbiddenError(), 403], [new NotFoundError("Payment"), 404], [new ConflictError(), 409], [new Error("Prisma secret metadata"), 500],
    ] as const;
    for (const [error, status] of cases) {
      const handler = createPaymentMutationHandler(async () => { throw error; }, "test", async () => identity);
      const response = await handler(request(), context);
      assert.equal(response.status, status);
      assert.equal((await response.text()).includes("Prisma secret metadata"), false);
    }
  });

  it("returns query data only after a resolved staff identity", async () => {
    const handler = createPaymentQueryHandler(async (actor, id) => ({ id, role: actor.role }), "test", async () => identity);
    const response = await handler(new NextRequest(`http://localhost/api/admin/applications/${applicationId}/payment`, {
      headers: { cookie: "sls_admin_session=test" },
    }), context);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, data: { id: applicationId, role: "MANAGER" } });
  });
});
