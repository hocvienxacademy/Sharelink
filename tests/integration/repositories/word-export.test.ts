import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { PrismaWordExportRepository } from "../../../src/modules/word-export/infrastructure/prisma-word-export-repository";
import { TEST_IDS } from "../../fixtures/test-data";
import { withTestClient } from "../../helpers/test-database";

const linkId = randomUUID();
const applicationId = randomUUID();
const repository = new PrismaWordExportRepository();

before(async () => {
  await withTestClient(async (client) => {
    await client.query(
      "INSERT INTO registration_links (id,public_token,sale_id,admission_period_id,status,expires_at) VALUES ($1,$2,$3,$4,'ACTIVE',CURRENT_TIMESTAMP + INTERVAL '1 day')",
      [linkId, randomUUID(), TEST_IDS.sale, TEST_IDS.openPeriod],
    );
    await client.query(
      "INSERT INTO applications (id,registration_link_id,sale_id,admission_period_id,major_id,status,version,full_name,submitted_at) VALUES ($1,$2,$3,$4,$5,'SUBMITTED',1,'Word Export Student',CURRENT_TIMESTAMP)",
      [applicationId, linkId, TEST_IDS.sale, TEST_IDS.openPeriod, TEST_IDS.majorOne],
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
  it("allows the owning SALE to load a submitted application and audits the download", async () => {
    const record = await repository.loadForStaffDownload({
      actor: { userId: TEST_IDS.sale, username: "sale", role: "SALE" },
      applicationId,
      requestId: "sale-word-test",
    });
    assert.equal(record?.id, applicationId);
  });
});
