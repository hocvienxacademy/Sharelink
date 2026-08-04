import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import { PrismaPaymentRepository } from "../../../src/modules/payments/infrastructure/prisma-payment-repository";
import type { AuthenticatedActor } from "../../../src/shared/authorization";
import { ConflictError } from "../../../src/shared/errors";
import { TEST_IDS } from "../../fixtures/test-data";
import { withTestClient } from "../../helpers/test-database";

const linkIds: string[] = [];
const admin: AuthenticatedActor = { userId: TEST_IDS.admin, username: "admin", role: "ADMIN" };

async function seedPayment(tuition: string | null, amount: string | null) {
  const linkId = randomUUID();
  const applicationId = randomUUID();
  const paymentId = randomUUID();
  linkIds.push(linkId);
  const updatedAt = new Date("2026-08-04T08:00:00.000Z");
  await withTestClient(async (client) => {
    await client.query(
      `INSERT INTO registration_links (id, public_token, sale_id, admission_period_id, tuition_amount, status, expires_at)
       VALUES ($1,$2,$3,$4,$5,'ACTIVE',CURRENT_TIMESTAMP + INTERVAL '1 day')`,
      [linkId, randomUUID(), TEST_IDS.sale, TEST_IDS.openPeriod, tuition],
    );
    await client.query(
      `INSERT INTO applications (id, registration_link_id, sale_id, admission_period_id, status, version, full_name)
       VALUES ($1,$2,$3,$4,'VALID',1,'Payment Test Student')`,
      [applicationId, linkId, TEST_IDS.sale, TEST_IDS.openPeriod],
    );
    await client.query(
      `INSERT INTO payment_confirmations
       (id, application_id, bank_name, account_number, account_name, amount, transfer_content, status, updated_at)
       VALUES ($1,$2,'Test Bank','0123456789','TEST ACCOUNT',$3,'PAYMENT TEST','PENDING',$4)`,
      [paymentId, applicationId, amount, updatedAt],
    );
  });
  return { applicationId, paymentId };
}

async function currentUpdatedAt(repository: PrismaPaymentRepository, applicationId: string): Promise<Date> {
  const detail = await repository.findDetailByApplicationId(applicationId, { kind: "all" });
  assert.notEqual(detail, null);
  return new Date(detail!.updatedAtIso);
}

after(async () => {
  await withTestClient(async (client) => {
    for (const linkId of linkIds) {
      await client.query("DELETE FROM audit_logs WHERE entity_id IN (SELECT id FROM payment_confirmations WHERE application_id IN (SELECT id FROM applications WHERE registration_link_id=$1))", [linkId]);
      await client.query("DELETE FROM applications WHERE registration_link_id=$1", [linkId]);
      await client.query("DELETE FROM registration_links WHERE id=$1", [linkId]);
    }
  });
});

describe("payment confirmation PostgreSQL workflow", () => {
  it("requires exact configured tuition, permits one concurrent confirmation, and keeps audit safe", async () => {
    const repository = new PrismaPaymentRepository();
    const fixture = await seedPayment("2500000.00", "2400000.00");
    const initialUpdatedAt = await currentUpdatedAt(repository, fixture.applicationId);
    const base = {
      actor: admin,
      applicationId: fixture.applicationId,
      confirmationNote: "Internal payment note",
      expectedStatus: "PENDING" as const,
      expectedUpdatedAt: initialUpdatedAt,
      occurredAt: new Date("2026-08-04T09:00:00.000Z"),
      requestId: "payment-confirm-race",
    };

    await assert.rejects(repository.confirm(base), ConflictError);
    await withTestClient(async (client) => {
      await client.query("UPDATE payment_confirmations SET amount='2500000.00' WHERE application_id=$1", [fixture.applicationId]);
    });
    const refreshedUpdatedAt = await currentUpdatedAt(repository, fixture.applicationId);
    const currentBase = { ...base, expectedUpdatedAt: refreshedUpdatedAt };

    const results = await Promise.allSettled([repository.confirm(currentBase), repository.confirm(currentBase)]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected" && result.reason instanceof ConflictError).length, 1);

    await withTestClient(async (client) => {
      const payment = await client.query("SELECT status, confirmed_by, confirmed_at, confirmation_note FROM payment_confirmations WHERE application_id=$1", [fixture.applicationId]);
      const application = await client.query("SELECT status FROM applications WHERE id=$1", [fixture.applicationId]);
      const audit = await client.query("SELECT action, metadata::text AS metadata, old_values::text AS old_values, new_values::text AS new_values FROM audit_logs WHERE entity_id=$1", [fixture.paymentId]);
      assert.equal(payment.rows[0].status, "CONFIRMED");
      assert.equal(payment.rows[0].confirmed_by, TEST_IDS.admin);
      assert.equal(payment.rows[0].confirmation_note, "Internal payment note");
      assert.equal(application.rows[0].status, "VALID");
      assert.equal(audit.rowCount, 1);
      assert.equal(audit.rows[0].action, "PAYMENT_CONFIRMED");
      const serializedAudit = JSON.stringify(audit.rows[0]);
      assert.equal(serializedAudit.includes("Internal payment note"), false);
      assert.equal(serializedAudit.includes("2500000"), false);
      assert.equal(serializedAudit.includes("0123456789"), false);
    });
  });

  it("rejects missing tuition and makes CANCELLED terminal while retaining confirmation evidence", async () => {
    const repository = new PrismaPaymentRepository();
    const missingTuition = await seedPayment(null, "2500000.00");
    const missingTuitionUpdatedAt = await currentUpdatedAt(repository, missingTuition.applicationId);
    await assert.rejects(repository.confirm({
      actor: admin, applicationId: missingTuition.applicationId, confirmationNote: null,
      expectedStatus: "PENDING", expectedUpdatedAt: missingTuitionUpdatedAt,
      occurredAt: new Date("2026-08-04T09:00:00.000Z"), requestId: "missing-tuition",
    }), ConflictError);

    const fixture = await seedPayment("2500000.00", "2500000.00");
    const fixtureUpdatedAt = await currentUpdatedAt(repository, fixture.applicationId);
    const confirmed = await repository.confirm({
      actor: admin, applicationId: fixture.applicationId, confirmationNote: "confirmed once",
      expectedStatus: "PENDING", expectedUpdatedAt: fixtureUpdatedAt,
      occurredAt: new Date("2026-08-04T09:00:00.000Z"), requestId: "confirm-before-cancel",
    });
    const cancelled = await repository.cancel({
      actor: admin, applicationId: fixture.applicationId, reason: "Duplicate bank transfer",
      expectedStatus: "CONFIRMED", expectedUpdatedAt: confirmed.updatedAt,
      occurredAt: new Date("2026-08-04T10:00:00.000Z"), requestId: "cancel-payment",
    });
    assert.equal(cancelled.status, "CANCELLED");
    await assert.rejects(repository.confirm({
      actor: admin, applicationId: fixture.applicationId, confirmationNote: null,
      expectedStatus: "PENDING", expectedUpdatedAt: cancelled.updatedAt,
      occurredAt: new Date("2026-08-04T11:00:00.000Z"), requestId: "reconfirm-cancelled",
    }), ConflictError);

    await withTestClient(async (client) => {
      const row = await client.query("SELECT status, confirmed_by, confirmed_at, confirmation_note, cancelled_by, cancelled_at, cancellation_reason FROM payment_confirmations WHERE application_id=$1", [fixture.applicationId]);
      assert.equal(row.rows[0].status, "CANCELLED");
      assert.equal(row.rows[0].confirmed_by, TEST_IDS.admin);
      assert.equal(row.rows[0].confirmation_note, "confirmed once");
      assert.equal(row.rows[0].cancelled_by, TEST_IDS.admin);
      assert.equal(row.rows[0].cancellation_reason, "Duplicate bank transfer");
      const audit = await client.query("SELECT action, metadata::text AS metadata FROM audit_logs WHERE entity_id=$1 ORDER BY created_at", [fixture.paymentId]);
      assert.deepEqual(audit.rows.map((item) => item.action), ["PAYMENT_CONFIRMED", "PAYMENT_CONFIRMATION_CANCELLED"]);
      assert.equal(audit.rows.some((item) => item.metadata.includes("Duplicate bank transfer")), false);
    });
  });
});
