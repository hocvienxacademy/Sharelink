import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import type { StaffIdentity } from "@/modules/auth";
import { createStaffApplicationHistoryHandler } from "./staff-application-query-handler";

const identity: StaffIdentity = {
  id: "10000000-0000-4000-8000-000000000001",
  username: "sale",
  fullName: "Sale",
  email: "sale@test.invalid",
  role: "SALE",
};
const id = "40000000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ id }) };
const request = new NextRequest(`http://localhost/api/admin/applications/${id}/history`, {
  headers: { cookie: "sls_admin_session=test" },
});

describe("staff application history HTTP boundary", () => {
  it("requires a session and hides missing or out-of-scope resources", async () => {
    const history = async () => [];
    assert.equal((await createStaffApplicationHistoryHandler(history, async () => null)(request, context)).status, 401);
    assert.equal((await createStaffApplicationHistoryHandler(async () => null, async () => identity)(request, context)).status, 404);
  });

  it("returns only the allowlisted history DTO", async () => {
    const handler = createStaffApplicationHistoryHandler(async () => [{
      id: "history-1",
      previousStatus: "SUBMITTED",
      newStatus: "NEEDS_REVISION",
      actorName: "Reviewer",
      createdAt: new Date("2026-08-04T08:00:00.000Z"),
      reason: "Please add the diploma.",
    }], async () => identity);
    const response = await handler(request, context);
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.equal(text.includes("password"), false);
    assert.equal(text.includes("publicToken"), false);
    assert.deepEqual(JSON.parse(text), { success: true, data: [{
      id: "history-1",
      previousStatus: "SUBMITTED",
      newStatus: "NEEDS_REVISION",
      actorName: "Reviewer",
      createdAt: "2026-08-04T08:00:00.000Z",
      reason: "Please add the diploma.",
    }] });
  });
});
