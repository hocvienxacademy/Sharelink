import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AuthenticatedActor } from "../../../src/shared/authorization";
import { ConflictError } from "../../../src/shared/errors";
import {
  GetPublicSystemSettings,
  GetSystemSettingHistory,
  ListSystemSettings,
  UpdateSystemSetting,
} from "../../../src/modules/system-settings";
import { PrismaSystemSettingRepository } from "../../../src/modules/system-settings/infrastructure/prisma-system-setting-repository";
import { TEST_IDS } from "../../fixtures/test-data";
import { withTestClient } from "../../helpers/test-database";

const key = "payment.instructions";
const repository = new PrismaSystemSettingRepository();
const list = new ListSystemSettings(repository);
const publicSettings = new GetPublicSystemSettings(repository);
const update = new UpdateSystemSetting(repository);
const history = new GetSystemSettingHistory(repository);
const admin: AuthenticatedActor = { userId: TEST_IDS.admin, username: "admin", role: "ADMIN" };
const auditPrefix = "system-settings-int-";
let original: {
  setting_value: unknown;
  description: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
} | null = null;

before(async () => {
  await withTestClient(async (client) => {
    const result = await client.query("SELECT setting_value, description, updated_by, created_at, updated_at FROM system_settings WHERE setting_key=$1", [key]);
    original = result.rows[0] ?? null;
    if (original === null) {
      await client.query(
        "INSERT INTO system_settings (setting_key, setting_value, description) VALUES ($1,$2::jsonb,$3)",
        [key, JSON.stringify({ message: "Hướng dẫn ban đầu.", requireReceiptUpload: false }), "Payment instructions"],
      );
    }
  });
});

after(async () => {
  await withTestClient(async (client) => {
    await client.query("DROP TRIGGER IF EXISTS test_fail_system_setting_audit ON audit_logs");
    await client.query("DROP FUNCTION IF EXISTS test_fail_system_setting_audit() CASCADE");
    await client.query("DELETE FROM audit_logs WHERE action='SYSTEM_SETTING_UPDATED' AND metadata->>'correlationId' LIKE $1", [`${auditPrefix}%`]);
    if (original === null) {
      await client.query("DELETE FROM system_settings WHERE setting_key=$1", [key]);
    } else {
      await client.query(
        "UPDATE system_settings SET setting_value=$2::jsonb, description=$3, updated_by=$4, created_at=$5, updated_at=$6 WHERE setting_key=$1",
        [key, JSON.stringify(original.setting_value), original.description, original.updated_by, original.created_at, original.updated_at],
      );
    }
  });
});

describe("system setting PostgreSQL workflow", () => {
  it("returns allowlisted metadata and only the public message value", async () => {
    const items = await list.execute(admin);
    assert.equal(items.every((item) => ["payment.application_fee", "payment.instructions", "payment.transfer_content", "registration.link_policy"].includes(item.key)), true);
    for (const item of items) {
      if (item.key !== key) assert.equal("message" in item, false);
    }
    assert.equal(typeof (await publicSettings.execute()).paymentInstructions, "string");
    assert.equal((await publicSettings.execute()).applicationFeeAmount, 260000);
  });

  it("serializes concurrent updates, preserves server-owned fields and emits a safe audit", async () => {
    const current = (await list.execute(admin)).find((item) => item.key === key);
    assert.notEqual(current, undefined);
    const expectedUpdatedAt = current!.updatedAt.toISOString();
    const results = await Promise.allSettled([
      update.execute(admin, key, { message: "Hướng dẫn kiểm thử A.", expectedUpdatedAt }, { correlationId: `${auditPrefix}concurrent-a` }),
      update.execute(admin, key, { message: "Hướng dẫn kiểm thử B.", expectedUpdatedAt }, { correlationId: `${auditPrefix}concurrent-b` }),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected" && result.reason instanceof ConflictError).length, 1);
    await withTestClient(async (client) => {
      const setting = await client.query("SELECT setting_value FROM system_settings WHERE setting_key=$1", [key]);
      assert.equal(setting.rows[0].setting_value.requireReceiptUpload, false);
      const audits = await client.query("SELECT metadata::text AS metadata FROM audit_logs WHERE action='SYSTEM_SETTING_UPDATED' AND metadata->>'correlationId' LIKE $1", [`${auditPrefix}concurrent-%`]);
      assert.equal(audits.rows.length, 1);
      assert.equal(audits.rows[0].metadata.includes("Hướng dẫn kiểm thử"), false);
      assert.equal(audits.rows[0].metadata.includes("payment.instructions.message"), true);
    });
    const safeHistory = await history.execute(admin);
    assert.equal(safeHistory.some((entry) => entry.changedKeys.includes("payment.instructions.message")), true);
  });

  it("rolls back the message when audit persistence fails", async () => {
    const current = (await list.execute(admin)).find((item) => item.key === key)!;
    await withTestClient(async (client) => {
      await client.query(`CREATE OR REPLACE FUNCTION test_fail_system_setting_audit() RETURNS trigger AS $$
        BEGIN RAISE EXCEPTION 'forced settings audit failure'; END; $$ LANGUAGE plpgsql`);
      await client.query(`CREATE TRIGGER test_fail_system_setting_audit BEFORE INSERT ON audit_logs
        FOR EACH ROW WHEN (NEW.action = 'SYSTEM_SETTING_UPDATED') EXECUTE FUNCTION test_fail_system_setting_audit()`);
    });
    try {
      await assert.rejects(update.execute(admin, key, {
        message: "Nội dung không được phép commit.",
        expectedUpdatedAt: current.updatedAt.toISOString(),
      }, { correlationId: `${auditPrefix}rollback` }));
      const afterFailure = (await list.execute(admin)).find((item) => item.key === key)!;
      assert.equal(afterFailure.message, current.message);
      assert.equal(afterFailure.updatedAt.getTime(), current.updatedAt.getTime());
    } finally {
      await withTestClient(async (client) => {
        await client.query("DROP TRIGGER IF EXISTS test_fail_system_setting_audit ON audit_logs");
        await client.query("DROP FUNCTION IF EXISTS test_fail_system_setting_audit()");
      });
    }
  });
});
