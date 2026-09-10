import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import type { StaffIdentity } from "@/modules/auth";
import {
  createStaffWordExportHandler,
} from "./word-export-handler";

const applicationId = "22222222-2222-4222-8222-222222222222";
const download = {
  bytes: new Uint8Array([80, 75, 3, 4]),
  fileName: "phieu-du-tuyen-HS-001.docx",
};

describe("Word export HTTP boundary", () => {
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
