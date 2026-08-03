import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import type { StaffIdentity } from "@/modules/auth";
import { createDeniedStaffApplicationUpdateHandler } from "./staff-application-mutation-handler";

const sale: StaffIdentity = {
  id: "10000000-0000-4000-8000-000000000001",
  username: "sale-test",
  fullName: "Test Sale",
  email: "sale@test.invalid",
  role: "SALE",
};

function request(origin = "http://localhost") {
  return new NextRequest("http://localhost/api/admin/applications/40000000-0000-4000-8000-000000000001", {
    method: "PATCH",
    headers: { origin, cookie: "sls_admin_session=test", "content-type": "application/json" },
    body: JSON.stringify({ fullName: "Forbidden" }),
  });
}

describe("staff application mutation deny boundary", () => {
  it("returns 403 when SALE directly PATCHes an application", async () => {
    const response = await createDeniedStaffApplicationUpdateHandler(async () => sale)(request());
    assert.equal(response.status, 403);
  });

  it("returns 401 without a staff session and rejects cross-origin requests", async () => {
    assert.equal((await createDeniedStaffApplicationUpdateHandler(async () => null)(request())).status, 401);
    assert.equal((await createDeniedStaffApplicationUpdateHandler(async () => sale)(request("https://evil.invalid"))).status, 400);
  });
});
