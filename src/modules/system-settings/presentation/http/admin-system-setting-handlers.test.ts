import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import type { StaffIdentity } from "@/modules/auth";
import { ForbiddenError, ValidationError } from "@/shared/errors";
import {
  createSystemSettingHistoryHandler,
  createSystemSettingListHandler,
  createSystemSettingUpdateHandler,
} from "./admin-system-setting-handlers";

const identity: StaffIdentity = {
  id: "10000000-0000-4000-8000-000000000001",
  username: "admin",
  fullName: "Admin",
  email: "admin@test.invalid",
  role: "ADMIN",
};
const request = (method: "GET" | "PATCH", body?: unknown, origin = "http://localhost") => new NextRequest(
  "http://localhost/api/admin/system-settings/payment.instructions",
  {
    method,
    headers: { cookie: "sls_admin_session=test", origin, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  },
);

describe("system setting HTTP handlers", () => {
  it("requires authentication and rejects cross-origin writes before the operation", async () => {
    let called = false;
    const unauthenticated = createSystemSettingUpdateHandler(async () => { called = true; return {}; }, async () => null);
    const payload = { message: "Thanh toán tại quầy.", expectedUpdatedAt: "2026-08-04T00:00:00.000Z" };
    assert.equal((await unauthenticated(request("PATCH", payload), { params: Promise.resolve({ key: "payment.instructions" }) })).status, 401);
    const crossOrigin = createSystemSettingUpdateHandler(async () => { called = true; return {}; }, async () => identity);
    assert.equal((await crossOrigin(request("PATCH", payload, "https://evil.invalid"), { params: Promise.resolve({ key: "payment.instructions" }) })).status, 400);
    assert.equal(called, false);
  });

  it("passes server identity, key, payload and a server correlation id", async () => {
    const payload = { message: "Thanh toán tại quầy.", expectedUpdatedAt: "2026-08-04T00:00:00.000Z" };
    const handler = createSystemSettingUpdateHandler(async (actor, key, input, context) => {
      assert.equal(actor.userId, identity.id);
      assert.equal(key, "payment.instructions");
      assert.deepEqual(input, payload);
      assert.notEqual(context.correlationId, "");
      return { key };
    }, async () => identity);
    assert.equal((await handler(request("PATCH", payload), { params: Promise.resolve({ key: "payment.instructions" }) })).status, 200);
  });

  it("supports no-store ADMIN reads and maps denied or invalid requests", async () => {
    const list = createSystemSettingListHandler(async () => [{ key: "payment.instructions" }], async () => identity);
    const response = await list(request("GET"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const history = createSystemSettingHistoryHandler(async () => [], async () => identity);
    assert.equal((await history(request("GET"))).status, 200);
    const denied = createSystemSettingListHandler(async () => { throw new ForbiddenError(); }, async () => identity);
    assert.equal((await denied(request("GET"))).status, 403);
    const invalid = createSystemSettingUpdateHandler(async () => {
      throw new ValidationError([{ path: ["key"], code: "unsupported_setting", message: "Khóa không hợp lệ." }]);
    }, async () => identity);
    assert.equal((await invalid(request("PATCH", {}), { params: Promise.resolve({ key: "secret.api_key" }) })).status, 422);
  });
});
