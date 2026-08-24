import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import type { DatabaseError as PgError } from "pg";
import { TEST_IDS } from "../../fixtures/test-data";
import { restoreSeedData } from "../../helpers/integration-fixtures";
import { withTestClient } from "../../helpers/test-database";

beforeEach(restoreSeedData);

async function expectCheckViolation(
  constraint: string,
  sql: string,
  parameters: readonly unknown[] = [],
): Promise<void> {
  await withTestClient(async (client) => {
    await client.query("BEGIN");

    try {
      await client.query(sql, [...parameters]);
      assert.fail(`Expected ${constraint} to reject the statement.`);
    } catch (error: unknown) {
      const databaseError = error as PgError;
      assert.equal(databaseError.code, "23514");
      assert.equal(databaseError.constraint, constraint);
    } finally {
      await client.query("ROLLBACK");
    }
  });
}

test("all required PostgreSQL CHECK definitions are present", async () => {
  const expected = [
    "chk_admission_period_dates",
    "chk_application_export_credentials_failed_attempts",
    "chk_application_export_credentials_secret_hash",
    "chk_application_relatives_phone",
    "chk_application_relatives_position",
    "chk_applications_citizen_id",
    "chk_applications_graduation_year",
    "chk_applications_phone",
    "chk_applications_version",
    "chk_majors_display_order",
    "chk_payment_cancelled_fields",
    "chk_payment_confirmations_amount",
    "chk_payment_confirmed_fields",
    "chk_registration_links_access_count",
    "chk_registration_links_expiry",
    "chk_registration_links_tuition",
    "chk_users_failed_login_attempts",
    "chk_users_not_own_manager",
    "chk_users_phone",
    "chk_users_username_canonical",
    "chk_users_username_not_blank",
  ];
  const actual = await withTestClient(async (client) => {
    const result = await client.query<{ constraint_name: string }>(
      `SELECT conname AS constraint_name
       FROM pg_constraint
       WHERE contype = 'c' AND connamespace = 'public'::regnamespace
       ORDER BY conname`,
    );
    return result.rows.map((row) => row.constraint_name);
  });

  for (const constraint of expected) {
    assert.ok(actual.includes(constraint), `${constraint} is missing`);
  }
});

test("date, ordering, and registration-link CHECK constraints reject invalid boundaries", async () => {
  await expectCheckViolation(
    "chk_admission_period_dates",
    `INSERT INTO admission_periods
       (code, name, start_date, end_date)
     VALUES ('INVALID-DATES', 'Invalid dates', CURRENT_DATE, CURRENT_DATE - 1)`,
  );
  await expectCheckViolation(
    "chk_majors_display_order",
    "INSERT INTO majors (code, name, display_order) VALUES ('INVALID-ORDER', 'Invalid order', -1)",
  );
  await expectCheckViolation(
    "chk_registration_links_access_count",
    `INSERT INTO registration_links
       (public_token, sale_id, status, access_count)
     VALUES ('60000000-0000-4000-8000-000000000001', $1, 'ACTIVE', -1)`,
    [TEST_IDS.sale],
  );
  await expectCheckViolation(
    "chk_registration_links_expiry",
    `INSERT INTO registration_links
       (public_token, sale_id, status, created_at, expires_at)
     VALUES ('60000000-0000-4000-8000-000000000002', $1, 'ACTIVE',
             CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '1 second')`,
    [TEST_IDS.sale],
  );
  await expectCheckViolation(
    "chk_registration_links_tuition",
    `INSERT INTO registration_links
       (public_token, sale_id, status, tuition_amount)
     VALUES ('60000000-0000-4000-8000-000000000003', $1, 'ACTIVE', -1)`,
    [TEST_IDS.sale],
  );
});

test("application and relative CHECK constraints reject invalid values and rollback", async () => {
  const applicationInsert = async (
    constraint: string,
    suffix: string,
    extraColumns: string,
    extraValues: string,
  ) => {
    await expectCheckViolation(
      constraint,
      `WITH test_link AS (
         INSERT INTO registration_links
           (id, public_token, sale_id, admission_period_id, status)
         VALUES
           ('70000000-0000-4000-8000-0000000000${suffix}',
            '71000000-0000-4000-8000-0000000000${suffix}',
            $1, $2, 'ACTIVE')
         RETURNING id
       )
       INSERT INTO applications
         (registration_link_id, sale_id, admission_period_id${extraColumns})
       SELECT id, $1, $2${extraValues} FROM test_link`,
      [TEST_IDS.sale, TEST_IDS.openPeriod],
    );
  };

  await applicationInsert(
    "chk_applications_citizen_id",
    "01",
    ", citizen_id",
    ", 'invalid'",
  );
  await applicationInsert(
    "chk_applications_graduation_year",
    "02",
    ", graduation_year",
    ", 1949",
  );
  await applicationInsert(
    "chk_applications_phone",
    "03",
    ", phone",
    ", '123'",
  );
  await applicationInsert(
    "chk_applications_version",
    "04",
    ", version",
    ", 0",
  );

  const relativeInsert = async (
    constraint: string,
    suffix: string,
    position: number,
    phone: string,
  ) => {
    await expectCheckViolation(
      constraint,
      `WITH test_link AS (
         INSERT INTO registration_links
           (id, public_token, sale_id, admission_period_id, status)
         VALUES
           ('72000000-0000-4000-8000-0000000000${suffix}',
            '73000000-0000-4000-8000-0000000000${suffix}',
            $1, $2, 'ACTIVE')
         RETURNING id
       ), test_application AS (
         INSERT INTO applications (registration_link_id, sale_id, admission_period_id)
         SELECT id, $1, $2 FROM test_link RETURNING id
       )
       INSERT INTO application_relatives (application_id, position, phone)
       SELECT id, $3, $4 FROM test_application`,
      [TEST_IDS.sale, TEST_IDS.openPeriod, position, phone],
    );
  };

  await relativeInsert(
    "chk_application_relatives_position",
    "01",
    3,
    "0900000001",
  );
  await relativeInsert(
    "chk_application_relatives_phone",
    "02",
    1,
    "invalid",
  );

  const leakedRows = await withTestClient(async (client) => {
    const result = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM registration_links
       WHERE id::text LIKE '7%'`,
    );
    return result.rows[0]?.count;
  });
  assert.equal(leakedRows, "0");
});
