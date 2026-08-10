import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import { ConflictError } from "../../../src/shared/errors/index";
import { PrismaApplicationRepository } from "../../../src/modules/applications/infrastructure/prisma-application-repository";
import { TEST_IDS } from "../../fixtures/test-data";
import { withTestClient } from "../../helpers/test-database";

const ids: string[] = [];
async function seed(status: "SUBMITTED" | "NEEDS_REVISION") {
  const linkId = randomUUID(); const applicationId = randomUUID(); ids.push(linkId);
  await withTestClient(async (client) => {
    await client.query(`INSERT INTO registration_links (id, public_token, sale_id, admission_period_id, status, expires_at) VALUES ($1,$2,$3,$4,'ACTIVE',CURRENT_TIMESTAMP + INTERVAL '1 day')`, [linkId, randomUUID(), TEST_IDS.sale, TEST_IDS.openPeriod]);
    await client.query(`INSERT INTO applications (id, registration_link_id, sale_id, admission_period_id, status, version, full_name) VALUES ($1,$2,$3,$4,$5,1,'Student')`, [applicationId, linkId, TEST_IDS.sale, TEST_IDS.openPeriod, status]);
  });
  return { linkId, applicationId };
}
after(async () => { await withTestClient(async (client) => { for (const id of ids) { await client.query("DELETE FROM audit_logs WHERE entity_id IN (SELECT id FROM applications WHERE registration_link_id=$1)", [id]); await client.query("DELETE FROM applications WHERE registration_link_id=$1", [id]); await client.query("DELETE FROM registration_links WHERE id=$1", [id]); } }); });

describe("staff application review PostgreSQL transaction", () => {
  it("updates content with safe audit metadata and permits one concurrent review winner", async () => {
    const { applicationId } = await seed("SUBMITTED"); const repository = new PrismaApplicationRepository();
    const updated = await repository.updateContent({ actorId: TEST_IDS.manager, actorRole: "MANAGER", applicationId, changedFields: ["fullName"], expectedStatus: "SUBMITTED", expectedVersion: 1, requestId: "staff-edit", scope: { kind: "manager", managerId: TEST_IDS.manager }, values: { expectedVersion: 1, fullName: "Updated Student" }, majorId: undefined, entryQualification: undefined });
    assert.equal(updated.version, 2);
    const common = { actorId: TEST_IDS.manager, actorRole: "MANAGER" as const, applicationId, expectedVersion: 2, reason: null, requestId: "review-race", reviewedAt: new Date(), scope: { kind: "manager" as const, managerId: TEST_IDS.manager } };
    const results = await Promise.allSettled([repository.review({ ...common, newStatus: "VALID" }), repository.review({ ...common, newStatus: "NEEDS_REVISION", reason: "Bổ sung dữ liệu" })]);
    assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(results.filter((item) => item.status === "rejected" && item.reason instanceof ConflictError).length, 1);
    await withTestClient(async (client) => {
      const histories = await client.query("SELECT reason FROM application_status_histories WHERE application_id=$1", [applicationId]);
      const audits = await client.query("SELECT metadata::text AS metadata FROM audit_logs WHERE entity_id=$1 ORDER BY created_at", [applicationId]);
      assert.equal(histories.rowCount, 1); assert.equal(audits.rowCount, 2);
      assert.equal(audits.rows.some((row) => row.metadata.includes("Updated Student") || row.metadata.includes("Bổ sung dữ liệu")), false);
    });
  });

  it("lets a student-owned repository edit and resubmit NEEDS_REVISION without deleting old reason", async () => {
    const { linkId, applicationId } = await seed("NEEDS_REVISION"); const repository = new PrismaApplicationRepository();
    await withTestClient((client) => client.query("INSERT INTO application_status_histories (application_id,previous_status,new_status,reason) VALUES ($1,'SUBMITTED','NEEDS_REVISION','Bổ sung số điện thoại')", [applicationId]));
    const edited = await repository.updateDraft({ applicationId, registrationLinkId: linkId, expectedStatus: "NEEDS_REVISION", expectedVersion: 1, majorId: undefined, entryQualification: undefined, values: { expectedVersion: 1, phone: "0901234567" } });
    const submitted = await repository.submit({ applicationId, registrationLinkId: linkId, expectedStatus: "NEEDS_REVISION", expectedVersion: edited.version, submittedAt: new Date(), exportCredentialDigest: "a".repeat(64) });
    assert.equal(submitted.status, "SUBMITTED");
    await withTestClient(async (client) => { const rows = await client.query("SELECT new_status,reason FROM application_status_histories WHERE application_id=$1", [applicationId]); assert.deepEqual(new Set(rows.rows.map((row) => row.new_status)), new Set(["NEEDS_REVISION", "SUBMITTED"])); assert.equal(rows.rows.find((row) => row.new_status === "NEEDS_REVISION")?.reason, "Bổ sung số điện thoại"); });
  });
});
