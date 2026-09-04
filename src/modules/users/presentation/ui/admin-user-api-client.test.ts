import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AdminUserApiError, mutateAdminUser } from "./admin-user-api-client";

describe("mutateAdminUser", () => {
  it("returns the fresh concurrency version after a successful manager assignment", async () => {
    const result = await mutateAdminUser(
      "10000000-0000-4000-8000-000000000010",
      "manager",
      {},
      async () => new Response(JSON.stringify({ success: true, data: {
        id: "10000000-0000-4000-8000-000000000010",
        role: "SALE",
        status: "ACTIVE",
        updatedAt: "2026-09-04T00:00:01.000Z",
      } }), { status: 200 }),
    );
    assert.equal(result.updatedAt, "2026-09-04T00:00:01.000Z");
  });

  it("preserves the safe server conflict message", async () => {
    await assert.rejects(
      mutateAdminUser(
        "10000000-0000-4000-8000-000000000010",
        "manager",
        {},
        async () => new Response(JSON.stringify({ success: false, error: {
          code: "CONFLICT",
          message: "Quản lý trực tiếp không thay đổi.",
        } }), { status: 409 }),
      ),
      (error) => error instanceof AdminUserApiError && error.message === "Quản lý trực tiếp không thay đổi.",
    );
  });
});
