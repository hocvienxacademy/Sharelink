import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import { ConflictError } from "../../../src/shared/errors/index";
import { PrismaApplicationRepository } from "../../../src/modules/applications/infrastructure/prisma-application-repository";
import { TEST_IDS } from "../../fixtures/test-data";
import { withTestClient } from "../../helpers/test-database";

const linkIds: string[] = [];

async function seedApplication() {
  const linkId = randomUUID();
  const applicationId = randomUUID();
  linkIds.push(linkId);
  await withTestClient(async (client) => {
    await client.query(
      `INSERT INTO registration_links
         (id, public_token, sale_id, admission_period_id, status, expires_at)
       VALUES ($1, $2, $3, $4, 'ACTIVE', CURRENT_TIMESTAMP + INTERVAL '1 day')`,
      [linkId, randomUUID(), TEST_IDS.sale, TEST_IDS.openPeriod],
    );
    await client.query(
      `INSERT INTO applications
         (id, registration_link_id, sale_id, admission_period_id, status, version)
       VALUES ($1, $2, $3, $4, 'DRAFT', 1)`,
      [applicationId, linkId, TEST_IDS.sale, TEST_IDS.openPeriod],
    );
  });
  return applicationId;
}

after(async () => {
  await withTestClient(async (client) => {
    for (const linkId of linkIds) {
      await client.query(
        "DELETE FROM audit_logs WHERE entity_id IN (SELECT id FROM applications WHERE registration_link_id = $1)",
        [linkId],
      );
      await client.query("DELETE FROM applications WHERE registration_link_id = $1", [linkId]);
      await client.query("DELETE FROM registration_links WHERE id = $1", [linkId]);
    }
  });
});

describe("application fee PostgreSQL transaction", () => {
  it("stores the SALE update, clears stale reasons, redacts audit data, and rejects a stale writer", async () => {
    const applicationId = await seedApplication();
    const repository = new PrismaApplicationRepository();
    const first = await repository.updateFee({
      actorId: TEST_IDS.sale,
      applicationId,
      expectedVersion: 1,
      occurredAt: new Date(),
      reason: "Sinh viên chưa hoàn tất giao dịch",
      requestId: "fee-first",
      status: "NOT_TRANSFERRED",
    });
    assert.equal(first.version, 2);

    const race = await Promise.allSettled([
      repository.updateFee({
        actorId: TEST_IDS.sale,
        applicationId,
        expectedVersion: 2,
        occurredAt: new Date(),
        reason: null,
        requestId: "fee-transferred",
        status: "TRANSFERRED",
      }),
      repository.updateFee({
        actorId: TEST_IDS.sale,
        applicationId,
        expectedVersion: 2,
        occurredAt: new Date(),
        reason: "Yêu cầu cạnh tranh",
        requestId: "fee-race",
        status: "NOT_TRANSFERRED",
      }),
    ]);
    assert.equal(race.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(race.filter(
      (item) => item.status === "rejected" && item.reason instanceof ConflictError,
    ).length, 1);

    await withTestClient(async (client) => {
      const application = await client.query<{
        application_fee_transfer_reason: string | null;
        application_fee_transfer_status: string;
        version: number;
      }>(
        `SELECT application_fee_transfer_reason, application_fee_transfer_status, version
         FROM applications WHERE id = $1`,
        [applicationId],
      );
      assert.equal(application.rows[0]?.version, 3);
      if (application.rows[0]?.application_fee_transfer_status === "TRANSFERRED") {
        assert.equal(application.rows[0].application_fee_transfer_reason, null);
      }

      const audits = await client.query<{ payload: string }>(
        `SELECT concat_ws(' ', old_values::text, new_values::text, metadata::text) AS payload
         FROM audit_logs WHERE entity_id = $1`,
        [applicationId],
      );
      assert.equal(audits.rowCount, 2);
      assert.equal(audits.rows.some((row) =>
        row.payload.includes("Sinh viên chưa hoàn tất giao dịch") ||
        row.payload.includes("Yêu cầu cạnh tranh")
      ), false);
    });
  });

  it("enforces the transferred-without-reason invariant in PostgreSQL", async () => {
    const applicationId = await seedApplication();
    await assert.rejects(
      withTestClient((client) => client.query(
        `UPDATE applications
         SET application_fee_transfer_status = 'TRANSFERRED',
             application_fee_transfer_reason = 'Lý do lỗi thời'
         WHERE id = $1`,
        [applicationId],
      )),
      (error: unknown) => {
        const databaseError = error as { readonly code?: string; readonly constraint?: string };
        return databaseError.code === "23514" &&
          databaseError.constraint === "chk_applications_fee_transfer_reason";
      },
    );
  });
});
