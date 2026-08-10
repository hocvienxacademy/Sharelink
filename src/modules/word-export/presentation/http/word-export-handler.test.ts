import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import type { StaffIdentity } from "@/modules/auth";
import {
  createStaffWordExportHandler,
  createStudentWordExportHandler,
} from "./word-export-handler";

const token = "11111111-1111-4111-8111-111111111111";
const applicationId = "22222222-2222-4222-8222-222222222222";
const download = {
  bytes: new Uint8Array([80, 75, 3, 4]),
  fileName: "phieu-du-tuyen-HS-001.docx",
};

describe("Word export HTTP boundary", () => {
  it("returns a private attachment for a student download", async () => {
    let receivedCode: unknown;
    const handler = createStudentWordExportHandler({
      forStudent: async (_token, code) => {
        receivedCode = code;
        return download;
      },
    }, { enforce: async () => undefined });
    const response = await handler(new Request(`http://localhost/api/registration-links/${token}/word`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost" },
      body: JSON.stringify({ downloadCode: "ASNFZ4mrze8BI0VniavN7w" }),
    }), { params: Promise.resolve({ token }) });

    assert.equal(receivedCode, "ASNFZ4mrze8BI0VniavN7w");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assert.match(response.headers.get("content-disposition") ?? "", /^attachment;/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), download.bytes);
  });

  it("requires same-origin student requests", async () => {
    const handler = createStudentWordExportHandler({ forStudent: async () => download }, { enforce: async () => undefined });
    const response = await handler(new Request(`http://localhost/api/registration-links/${token}/word`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://attacker.invalid" },
      body: JSON.stringify({ downloadCode: "ASNFZ4mrze8BI0VniavN7w" }),
    }), { params: Promise.resolve({ token }) });
    assert.equal(response.status, 400);
  });

  it("requires staff authentication", async () => {
    const request = new NextRequest(`http://localhost/api/admin/applications/${applicationId}/word`);
    const handler = createStaffWordExportHandler({ forStaff: async () => download }, async () => null);
    assert.equal((await handler(request, { params: Promise.resolve({ id: applicationId }) })).status, 401);
  });

  it("passes the authenticated SALE actor to the service", async () => {
    const identity: StaffIdentity = {
      id: "33333333-3333-4333-8333-333333333333",
      username: "sale",
      fullName: "Sale",
      email: "sale@test.invalid",
      role: "SALE",
    };
    let actorRole: string | undefined;
    const handler = createStaffWordExportHandler({
      forStaff: async (actor) => {
        actorRole = actor.role;
        return download;
      },
    }, async () => identity);
    const request = new NextRequest(`http://localhost/api/admin/applications/${applicationId}/word`, {
      headers: { cookie: "sls_admin_session=test" },
    });
    const response = await handler(request, { params: Promise.resolve({ id: applicationId }) });
    assert.equal(response.status, 200);
    assert.equal(actorRole, "SALE");
  });
});
