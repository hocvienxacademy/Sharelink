import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { TEST_IDS, TEST_TOKENS } from "../fixtures/test-data";
import { hashPassword } from "../../src/modules/auth/infrastructure/security/password";

loadEnv({ path: ".env.test.local", override: false, quiet: true });

const SAFE_DATABASE_NAME = /(^test[_-]|[_-]test($|[_-]))/i;
const DEFAULT_SAFE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "postgres",
]);

export interface SafeTestDatabase {
  readonly url: string;
  readonly database: string;
  readonly host: string;
}

function normalizedTarget(url: URL): string {
  return `${url.hostname.toLowerCase()}:${url.port || "5432"}/${url.pathname.replace(/^\/+/, "").toLowerCase()}`;
}

export function requireSafeTestDatabase(): SafeTestDatabase {
  const value = process.env.TEST_DATABASE_URL;

  if (!value) {
    throw new Error(
      "TEST_DATABASE_URL is required. Integration and E2E tests never fall back to DATABASE_URL.",
    );
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Test database operations are disabled when NODE_ENV=production.");
  }

  const url = new URL(value);
  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  const host = url.hostname.toLowerCase();

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("TEST_DATABASE_URL must use PostgreSQL.");
  }

  if (!SAFE_DATABASE_NAME.test(database)) {
    throw new Error(
      `Refusing database "${database}": its name must contain an explicit test marker.`,
    );
  }

  const configuredHosts = new Set(
    (process.env.TEST_DATABASE_ALLOWED_HOSTS ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
  const hostIsExplicitlySafe =
    DEFAULT_SAFE_HOSTS.has(host) ||
    configuredHosts.has(host) ||
    host.endsWith(".test");

  if (
    !hostIsExplicitlySafe ||
    host.includes("prod") ||
    host.includes("production")
  ) {
    throw new Error(
      `Refusing test database host "${host}". Add only a verified non-production host to TEST_DATABASE_ALLOWED_HOSTS.`,
    );
  }

  const developmentUrl =
    process.env.DEVELOPMENT_DATABASE_URL ?? process.env.DATABASE_URL;

  if (developmentUrl) {
    const parsedDevelopmentUrl = new URL(developmentUrl);

    if (normalizedTarget(url) === normalizedTarget(parsedDevelopmentUrl)) {
      throw new Error(
        "TEST_DATABASE_URL resolves to the same database as DATABASE_URL.",
      );
    }
  }

  return { url: value, database, host };
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

async function verifiedClient(): Promise<Client> {
  const target = requireSafeTestDatabase();
  const client = new Client({
    connectionString: target.url,
    application_name: "share-link-student-tests",
  });
  await client.connect();
  const result = await client.query<{ database: string }>(
    "SELECT current_database() AS database",
  );

  if (result.rows[0]?.database !== target.database) {
    await client.end();
    throw new Error("Connected database does not match TEST_DATABASE_URL.");
  }

  return client;
}

export async function createTestDatabase(): Promise<void> {
  const target = requireSafeTestDatabase();
  const adminUrl = new URL(target.url);
  adminUrl.pathname = "/postgres";
  const client = new Client({
    connectionString: adminUrl.toString(),
    application_name: "share-link-student-test-db-create",
  });
  await client.connect();

  try {
    const existing = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [target.database],
    );

    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE ${quoteIdentifier(target.database)}`);
    }
  } finally {
    await client.end();
  }
}

function generateBaseSchema(): string {
  const prismaCli = path.resolve("node_modules/prisma/build/index.js");
  const result = spawnSync(
    process.execPath,
    [
      prismaCli,
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema",
      "prisma/schema.prisma",
      "--script",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  if (result.status !== 0 || result.stdout.trim().length === 0) {
    throw new Error(
      `Unable to generate disposable test schema: ${result.stderr.trim()}`,
    );
  }

  return result.stdout;
}

export async function resetTestDatabase(): Promise<void> {
  const client = await verifiedClient();

  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query(generateBaseSchema());
    const extensions = await readFile(
      path.resolve("tests/fixtures/database/schema-extensions.sql"),
      "utf8",
    );
    await client.query(extensions);
  } finally {
    await client.end();
  }
}

export async function seedTestDatabase(): Promise<void> {
  const client = await verifiedClient();
  const adminPasswordHash = await hashPassword("admin-test-password");

  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO users (id, username, full_name, email, password_hash, role)
       VALUES ($1, 'manager-test', 'Test Manager', 'manager@test.invalid', $3, 'MANAGER'),
              ($2, 'sale-test', 'Test Sale', 'sale@test.invalid', $3, 'SALE')`,
      [TEST_IDS.manager, TEST_IDS.sale, adminPasswordHash],
    );
    await client.query("UPDATE users SET manager_id = $1 WHERE id = $2", [TEST_IDS.manager, TEST_IDS.sale]);
    await client.query(
      `INSERT INTO users (id, username, full_name, email, password_hash, role)
       VALUES ($1, 'admin', 'Test Admin', 'admin@test.invalid', $2, 'ADMIN')`,
      [TEST_IDS.admin, adminPasswordHash],
    );
    await client.query(
      `INSERT INTO admission_periods
         (id, code, name, start_date, end_date, is_active)
       VALUES
         ($1, 'OPEN-TEST', 'Open test period', CURRENT_DATE - 30, CURRENT_DATE + 30, true),
         ($2, 'CLOSED-TEST', 'Closed test period', CURRENT_DATE - 90, CURRENT_DATE - 60, true)`,
      [TEST_IDS.openPeriod, TEST_IDS.closedPeriod],
    );
    await client.query(
      `INSERT INTO majors (id, code, name, is_active, display_order)
       VALUES
         ($1, 'TEST-01', 'Test Major Alpha', true, 1),
         ($2, 'TEST-02', 'Test Major Beta', true, 2),
         ($3, 'TEST-99', 'Test Major Inactive', false, 99)`,
      [TEST_IDS.majorOne, TEST_IDS.majorTwo, TEST_IDS.inactiveMajor],
    );
    await client.query(
      `INSERT INTO registration_links
         (id, public_token, sale_id, admission_period_id, status, expires_at, created_at)
       VALUES
         ($1, $5, $9, $10, 'ACTIVE', CURRENT_TIMESTAMP + INTERVAL '7 days', CURRENT_TIMESTAMP),
         ($2, $6, $9, NULL, 'ACTIVE', CURRENT_TIMESTAMP + INTERVAL '7 days', CURRENT_TIMESTAMP),
         ($3, $7, $9, $10, 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '7 days'),
         ($4, $8, $9, $10, 'CANCELLED', CURRENT_TIMESTAMP + INTERVAL '7 days', CURRENT_TIMESTAMP)`,
      [
        TEST_IDS.activeLink,
        TEST_IDS.fallbackLink,
        TEST_IDS.expiredLink,
        TEST_IDS.inactiveLink,
        TEST_TOKENS.active,
        TEST_TOKENS.fallback,
        TEST_TOKENS.expired,
        TEST_TOKENS.inactive,
        TEST_IDS.sale,
        TEST_IDS.openPeriod,
      ],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

export async function prepareTestDatabase(): Promise<void> {
  await createTestDatabase();
  await resetTestDatabase();
  await seedTestDatabase();
}

export async function withTestClient<T>(
  operation: (client: Client) => Promise<T>,
): Promise<T> {
  const client = await verifiedClient();

  try {
    return await operation(client);
  } finally {
    await client.end();
  }
}
