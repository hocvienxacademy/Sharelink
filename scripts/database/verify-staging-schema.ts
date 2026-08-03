import { Client } from "pg";
import { validateStagingDatabaseTarget } from "../../src/shared/config/runtime-environment";
import { readSchemaFingerprint } from "./schema-fingerprint";

const EXPECTED_SCHEMA_SHA256 =
  "6190c6858f24781f1517a61d6cfb25b880ace8d57a0eba1d462ad7686b10ccda";

const EXPECTED_TABLES = [
  "admission_periods",
  "app_sessions",
  "application_relatives",
  "application_status_histories",
  "applications",
  "audit_logs",
  "bank_accounts",
  "majors",
  "payment_confirmations",
  "registration_link_status_histories",
  "registration_links",
  "system_settings",
  "users",
] as const;

const EXPECTED_CHECKS = [
  "chk_admission_period_dates",
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
] as const;

const EXPECTED_ENUMS = {
  admission_qualification_type: ["THPT", "TC", "CD", "DH"],
  application_status: [
    "DRAFT",
    "SUBMITTED",
    "WAITING_PAYMENT",
    "PAYMENT_CONFIRMED",
    "NEEDS_REVISION",
    "VALID",
    "PRINTED",
    "COMPLETED",
    "CANCELLED",
  ],
  gender_type: ["MALE", "FEMALE", "OTHER"],
  payment_status: ["PENDING", "CONFIRMED", "CANCELLED"],
  registration_link_status: [
    "DRAFT",
    "ACTIVE",
    "LOCKED",
    "SUBMITTED",
    "EXPIRED",
    "CANCELLED",
    "ARCHIVED",
  ],
  user_role: ["SALE", "MANAGER", "ADMIN"],
} as const;

function missing(expected: readonly string[], actual: readonly string[]): string[] {
  const values = new Set(actual);
  return expected.filter((value) => !values.has(value));
}

if (process.env.APP_ENV !== "staging") {
  throw new Error("Schema verification requires APP_ENV=staging.");
}
const url = validateStagingDatabaseTarget(process.env);
const connectionString = url.toString();
const database = decodeURIComponent(url.pathname.replace(/^\/+/, ""));

const client = new Client({
  connectionString,
  application_name: "share-link-student-staging-schema-verification",
  statement_timeout: 10_000,
  options: "-c default_transaction_read_only=on",
});
await client.connect();

try {
  const target = await client.query<{ database: string; read_only: string }>(
    `SELECT current_database() AS database,
            current_setting('transaction_read_only') AS read_only`,
  );
  if (
    target.rows[0]?.database !== database ||
    target.rows[0]?.read_only !== "on"
  ) {
    throw new Error("Staging verification connection is not read-only.");
  }

  const tables = await client.query<{ name: string }>(
    `SELECT tablename AS name
     FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  const checks = await client.query<{ name: string }>(
    `SELECT conname AS name
     FROM pg_constraint
     WHERE contype = 'c' AND connamespace = 'public'::regnamespace
     ORDER BY conname`,
  );
  const foreignKeys = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM pg_constraint
     WHERE contype = 'f' AND connamespace = 'public'::regnamespace`,
  );
  const uniqueConstraints = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM pg_constraint
     WHERE contype IN ('p', 'u') AND connamespace = 'public'::regnamespace`,
  );
  const enumRows = await client.query<{ name: string; value: string }>(
    `SELECT t.typname AS name, e.enumlabel AS value
     FROM pg_type t
     JOIN pg_enum e ON e.enumtypid = t.oid
     JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public'
     ORDER BY t.typname, e.enumsortorder`,
  );

  const failures = [
    ...missing(EXPECTED_TABLES, tables.rows.map((row) => row.name)).map(
      (name) => `missing table ${name}`,
    ),
    ...missing(EXPECTED_CHECKS, checks.rows.map((row) => row.name)).map(
      (name) => `missing CHECK ${name}`,
    ),
  ];
  for (const [name, values] of Object.entries(EXPECTED_ENUMS)) {
    const actual = enumRows.rows
      .filter((row) => row.name === name)
      .map((row) => row.value);
    if (JSON.stringify(actual) !== JSON.stringify(values)) {
      failures.push(`enum ${name} differs from the reviewed manifest`);
    }
  }
  if (Number(foreignKeys.rows[0]?.count ?? 0) < 1) {
    failures.push("no foreign keys found");
  }
  if (Number(uniqueConstraints.rows[0]?.count ?? 0) < EXPECTED_TABLES.length) {
    failures.push("primary/unique constraint count is unexpectedly low");
  }
  const schemaFingerprint = await readSchemaFingerprint(client);
  if (schemaFingerprint !== EXPECTED_SCHEMA_SHA256) {
    failures.push(
      `schema fingerprint differs from reviewed baseline (received ${schemaFingerprint})`,
    );
  }
  if (failures.length > 0) {
    throw new Error(`Staging schema verification failed: ${failures.join("; ")}`);
  }

  console.log(
    `Staging schema verified read-only: ${EXPECTED_TABLES.length} tables, ${EXPECTED_CHECKS.length} CHECK constraints, ${Object.keys(EXPECTED_ENUMS).length} enums.`,
  );
} finally {
  await client.end();
}
