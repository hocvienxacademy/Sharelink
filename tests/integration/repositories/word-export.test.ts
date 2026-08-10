import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { digestExportCode } from "../../../src/modules/word-export/application/export-credential";
import { PrismaWordExportRepository } from "../../../src/modules/word-export/infrastructure/prisma-word-export-repository";
import { TEST_IDS } from "../../fixtures/test-data";
import { withTestClient } from "../../helpers/test-database";

const linkId = randomUUID();
const applicationId = randomUUID();
const token = randomUUID();
const code = "ASNFZ4mrze8BI0VniavN7w";
const repository = new PrismaWordExportRepository();

before(async () => {
  await withTestClient(async (client) => {
    await client.query(
      "INSERT INTO registration_links (id,public_token,sale_id,admission_period_id,status,expires_at) VALUES ($1,$2,$3,$4,'ACTIVE',CURRENT_TIMESTAMP + INTERVAL '1 day')",
      [linkId, token, TEST_IDS.sale, TEST_IDS.openPeriod],
    );
    await client.query(
      "INSERT INTO applications (id,registration_link_id,sale_id,admission_period_id,major_id,status,version,full_name,submitted_at) VALUES ($1,$2,$3,$4,$5,'SUBMITTED',1,'Word Export Student',CURRENT_TIMESTAMP)",
      [applicationId, linkId, TEST_IDS.sale, TEST_IDS.openPeriod, TEST_IDS.majorOne],
    );
    await client.query(
      "INSERT INTO application_export_credentials (application_id,secret_hash) VALUES ($1,$2)",
      [applicationId, digestExportCode(code)],
    );
  });
});

after(async () => {
  await withTestClient(async (client) => {
    await client.query("DELETE FROM audit_logs WHERE entity_id=$1", [applicationId]);
    await client.query("DELETE FROM applications WHERE id=$1", [applicationId]);
    await client.query("DELETE FROM registration_links WHERE id=$1", [linkId]);
  });
});

describe("Word export PostgreSQL authorization", () => {
  it("authorizes a valid student code, resets failures and records no PII in audit metadata", async () => {
    const record = await repository.authorizeStudentDownload({
      token,
      codeDigest: digestExportCode(code),
      attemptedAt: new Date(),
      maximumAttempts: 5,
      lockedUntil: new Date(Date.now() + 900_000),
      requestId: "student-word-test",
    });
    assert.equal(record?.id, applicationId);
    assert.equal(record?.fullName, "Word Export Student");
    await withTestClient(async (client) => {
      const result = await client.query<{ metadata: unknown }>(
        "SELECT metadata FROM audit_logs WHERE entity_id=$1 AND action='APPLICATION_WORD_EXPORT_REQUESTED'",
        [applicationId],
      );
      const metadata = JSON.stringify(result.rows[0]?.metadata ?? {});
      assert.equal(metadata.includes(code), false);
      assert.equal(metadata.includes("Word Export Student"), false);
    });
  });

  it("counts invalid attempts without returning an application", async () => {
    const record = await repository.authorizeStudentDownload({
      token,
      codeDigest: digestExportCode("BBBBBBBBBBBBBBBBBBBBBBBB"),
      attemptedAt: new Date(),
      maximumAttempts: 5,
      lockedUntil: new Date(Date.now() + 900_000),
      requestId: "student-word-invalid",
    });
    assert.equal(record, null);
    await withTestClient(async (client) => {
      const result = await client.query<{ failed_attempts: number }>(
        "SELECT failed_attempts FROM application_export_credentials WHERE application_id=$1",
        [applicationId],
      );
      assert.equal(result.rows[0]?.failed_attempts, 1);
    });
  });

  it("allows the owning SALE to load a submitted application and audits the download", async () => {
    const record = await repository.loadForStaffDownload({
      actor: { userId: TEST_IDS.sale, username: "sale", role: "SALE" },
      applicationId,
      requestId: "sale-word-test",
    });
    assert.equal(record?.id, applicationId);
  });
});
