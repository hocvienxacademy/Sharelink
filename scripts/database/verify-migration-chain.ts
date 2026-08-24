import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { Client, type DatabaseError } from "pg";
import { readSchemaFingerprint } from "./schema-fingerprint";

loadEnv({ path: ".env", override: false, quiet: true });

const MIGRATION_DATABASE = "share_link_student_migration_test";
const RESTORE_DATABASE = "share_link_student_restore_test";
const SAFE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const EXPECTED_MIGRATIONS = [
  "20260731150000_baseline",
  "20260803150000_add_usernames",
  "20260804120000_add_application_fee_setting",
  "20260810150000_add_application_export_credentials",
] as const;
const EXPECTED_CHECKS = [
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
] as const;
const EXPECTED_SPECIAL_INDEXES = [
  "idx_applications_citizen_id",
  "idx_applications_full_name_lower",
  "idx_applications_phone",
  "uq_bank_accounts_default",
  "uq_majors_name_lower",
  "uq_users_email_lower",
  "uq_users_phone",
  "uq_users_username_lower",
] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function databaseUrl(base: URL, database: string): string {
  const url = new URL(base);
  url.pathname = `/${database}`;
  return url.toString();
}

async function dropDatabase(admin: Client, database: string): Promise<void> {
  assert(database.endsWith("_test"), `Refusing unsafe database name: ${database}`);
  await admin.query(
    `SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
     WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [database],
  );
  await admin.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(database)}`);
}

async function recreateDatabase(admin: Client, database: string): Promise<void> {
  await dropDatabase(admin, database);
  await admin.query(`CREATE DATABASE ${quoteIdentifier(database)}`);
}

function deployMigrations(url: string): void {
  const prismaCli = path.resolve("node_modules/prisma/build/index.js");
  const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url },
    encoding: "utf8",
  });
  assert(result.status === 0, `prisma migrate deploy failed: ${result.stderr.trim()}`);
}

async function seedRepresentativeData(client: Client): Promise<void> {
  await client.query("BEGIN");
  try {
    await client.query(`
      INSERT INTO users (id, username, full_name, email, password_hash, role)
      VALUES ('10000000-0000-4000-8000-000000000001', 'admin.restore',
              'Quản trị kiểm thử', 'admin.restore@test.invalid',
              'not-a-real-password-hash', 'ADMIN')
    `);
    await client.query(`
      INSERT INTO admission_periods (id, code, name, start_date, end_date)
      VALUES ('20000000-0000-4000-8000-000000000001', 'RESTORE-2026',
              'Kỳ tuyển sinh kiểm thử', DATE '2026-01-01', DATE '2026-12-31')
    `);
    await client.query(`
      INSERT INTO majors (id, code, name, display_order)
      VALUES ('30000000-0000-4000-8000-000000000001', 'RESTORE-MAJOR',
              'Ngành kiểm thử khôi phục', 1)
    `);
    await client.query(`
      INSERT INTO registration_links
        (id, public_token, sale_id, created_by, major_id, admission_period_id,
         student_name_hint, status, expires_at)
      VALUES
        ('40000000-0000-4000-8000-000000000001',
         '41000000-0000-4000-8000-000000000001',
         '10000000-0000-4000-8000-000000000001',
         '10000000-0000-4000-8000-000000000001',
         '30000000-0000-4000-8000-000000000001',
         '20000000-0000-4000-8000-000000000001',
         'Sinh viên kiểm thử', 'ACTIVE', CURRENT_TIMESTAMP + INTERVAL '7 days')
    `);
    await client.query(`
      INSERT INTO applications
        (id, registration_link_id, sale_id, major_id, admission_period_id,
         full_name, phone, citizen_id, version)
      VALUES
        ('50000000-0000-4000-8000-000000000001',
         '40000000-0000-4000-8000-000000000001',
         '10000000-0000-4000-8000-000000000001',
         '30000000-0000-4000-8000-000000000001',
         '20000000-0000-4000-8000-000000000001',
         'Nguyễn Văn Kiểm Thử', '0900000001', '001234567890', 1)
    `);
    await client.query(`
      INSERT INTO application_relatives
        (application_id, position, full_name, phone)
      VALUES ('50000000-0000-4000-8000-000000000001', 1,
              'Người thân kiểm thử', '0900000002')
    `);
    await client.query(`
      INSERT INTO application_export_credentials
        (application_id, secret_hash)
      VALUES ('50000000-0000-4000-8000-000000000001', repeat('a', 64))
    `);
    await client.query(`
      INSERT INTO application_status_histories
        (application_id, new_status, changed_by, reason)
      VALUES ('50000000-0000-4000-8000-000000000001', 'DRAFT',
              '10000000-0000-4000-8000-000000000001', 'Kiểm thử backup/restore')
    `);
    await client.query(`
      INSERT INTO audit_logs
        (actor_id, action, entity_type, entity_id, metadata)
      VALUES ('10000000-0000-4000-8000-000000000001', 'restore.test',
              'application', '50000000-0000-4000-8000-000000000001',
              '{"fixture":true}'::jsonb)
    `);
    await client.query(`
      INSERT INTO app_sessions (sid, sess, expire)
      VALUES ('restore-test-session', '{"fixture":true}'::json,
              CURRENT_TIMESTAMP + INTERVAL '1 hour')
    `);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function verifyDatabase(client: Client): Promise<void> {
  const migrations = await client.query<{ migration_name: string }>(
    `SELECT migration_name FROM _prisma_migrations
     WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
     ORDER BY migration_name`,
  );
  assert(
    JSON.stringify(migrations.rows.map((row) => row.migration_name)) ===
      JSON.stringify(EXPECTED_MIGRATIONS),
    "Applied migration history differs from the reviewed chain.",
  );

  const checks = await client.query<{ name: string }>(
    `SELECT conname AS name FROM pg_constraint
     WHERE contype = 'c' AND connamespace = 'public'::regnamespace
     ORDER BY conname`,
  );
  const checkNames = new Set(checks.rows.map((row) => row.name));
  for (const name of EXPECTED_CHECKS) {
    assert(checkNames.has(name), `Missing CHECK constraint ${name}.`);
  }

  const indexes = await client.query<{ name: string; definition: string }>(
    `SELECT indexname AS name, indexdef AS definition FROM pg_indexes
     WHERE schemaname = 'public' ORDER BY indexname`,
  );
  const indexNames = new Set(indexes.rows.map((row) => row.name));
  for (const name of EXPECTED_SPECIAL_INDEXES) {
    assert(indexNames.has(name), `Missing partial/expression index ${name}.`);
  }

  const comments = await client.query<{ count: string }>(`
    SELECT count(*)::text AS count FROM (
      SELECT obj_description(c.oid, 'pg_class') AS comment
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      UNION ALL
      SELECT col_description(c.oid, a.attnum)
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
        AND a.attnum > 0 AND NOT a.attisdropped
    ) documented WHERE comment IS NOT NULL
  `);
  assert(comments.rows[0]?.count === "5", "Expected five verified database comments.");

  try {
    await client.query(`
      INSERT INTO users (username, full_name, email, password_hash, role)
      VALUES (' ADMIN.RESTORE ', 'Invalid', 'invalid@test.invalid', 'invalid', 'ADMIN')
    `);
    throw new Error("Canonical username CHECK did not reject invalid input.");
  } catch (error: unknown) {
    const databaseError = error as DatabaseError;
    assert(
      databaseError.code === "23514" &&
        databaseError.constraint === "chk_users_username_canonical",
      "Canonical username negative check failed unexpectedly.",
    );
  }
}

function dockerPostgresHost(source: URL): string {
  return SAFE_HOSTS.has(source.hostname) ? "host.docker.internal" : source.hostname;
}

function dumpDatabase(source: URL, database: string): Buffer {
  const result = spawnSync(
    "docker",
    [
      "run", "--rm", "--network", "host", "-e", "PGPASSWORD",
      "postgres:18-alpine", "pg_dump", "--format=custom", "--no-owner",
      "--no-privileges", "--host", dockerPostgresHost(source), "--port",
      source.port || "5432", "--username", decodeURIComponent(source.username), database,
    ],
    { env: { ...process.env, PGPASSWORD: decodeURIComponent(source.password) }, maxBuffer: 50 * 1024 * 1024 },
  );
  assert(result.status === 0, `pg_dump failed: ${result.stderr.toString("utf8").trim()}`);
  assert(result.stdout.length > 0, "pg_dump produced an empty backup.");
  return result.stdout;
}

function restoreDatabase(source: URL, database: string, backup: Buffer): void {
  const result = spawnSync(
    "docker",
    [
      "run", "--rm", "--network", "host", "-i", "-e", "PGPASSWORD",
      "postgres:18-alpine", "pg_restore", "--exit-on-error", "--no-owner",
      "--no-privileges", "--host", dockerPostgresHost(source), "--port",
      source.port || "5432", "--username", decodeURIComponent(source.username),
      "--dbname", database,
    ],
    { env: { ...process.env, PGPASSWORD: decodeURIComponent(source.password) }, input: backup, maxBuffer: 50 * 1024 * 1024 },
  );
  assert(result.status === 0, `pg_restore failed: ${result.stderr.toString("utf8").trim()}`);
}

const configuredUrl = process.env.DATABASE_URL;
assert(configuredUrl, "DATABASE_URL is required for local migration verification.");
const source = new URL(configuredUrl);
assert(source.protocol === "postgresql:" || source.protocol === "postgres:", "PostgreSQL is required.");
assert(SAFE_HOSTS.has(source.hostname), "Migration verification is restricted to local PostgreSQL.");
assert(process.env.NODE_ENV !== "production", "Migration verification is disabled in production.");

const adminUrl = databaseUrl(source, "postgres");
const migrationUrl = databaseUrl(source, MIGRATION_DATABASE);
const restoreUrl = databaseUrl(source, RESTORE_DATABASE);
const admin = new Client({ connectionString: adminUrl, application_name: "migration-chain-verifier" });
await admin.connect();

let backupChecksum = "";
let schemaFingerprint = "";
try {
  await recreateDatabase(admin, MIGRATION_DATABASE);
  await recreateDatabase(admin, RESTORE_DATABASE);
  deployMigrations(migrationUrl);

  const migrated = new Client({ connectionString: migrationUrl });
  await migrated.connect();
  try {
    await seedRepresentativeData(migrated);
    await verifyDatabase(migrated);
    schemaFingerprint = await readSchemaFingerprint(migrated);
  } finally {
    await migrated.end();
  }

  const backup = dumpDatabase(source, MIGRATION_DATABASE);
  backupChecksum = createHash("sha256").update(backup).digest("hex");
  restoreDatabase(source, RESTORE_DATABASE, backup);

  const restored = new Client({ connectionString: restoreUrl });
  await restored.connect();
  try {
    await verifyDatabase(restored);
    assert(
      (await readSchemaFingerprint(restored)) === schemaFingerprint,
      "Restored schema fingerprint differs from the migrated database.",
    );
    const fixture = await restored.query<{ full_name: string; history_count: string }>(`
      SELECT application.full_name,
             count(history.id)::text AS history_count
      FROM applications application
      LEFT JOIN application_status_histories history
        ON history.application_id = application.id
      WHERE application.id = '50000000-0000-4000-8000-000000000001'
      GROUP BY application.id
    `);
    assert(fixture.rows[0]?.full_name === "Nguyễn Văn Kiểm Thử", "UTF-8 fixture did not survive restore.");
    assert(fixture.rows[0]?.history_count === "1", "Status history did not survive restore.");
  } finally {
    await restored.end();
  }

  console.log(
    `Migration chain and backup/restore verified (schema SHA-256 ${schemaFingerprint}; backup SHA-256 ${backupChecksum}).`,
  );
} finally {
  try {
    await dropDatabase(admin, MIGRATION_DATABASE);
    await dropDatabase(admin, RESTORE_DATABASE);
  } finally {
    await admin.end();
  }
}
