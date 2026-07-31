import assert from "node:assert/strict";
import { test } from "node:test";
import { requireSafeTestDatabase } from "../../helpers/test-database";

function withEnvironment(
  values: Readonly<Record<string, string | undefined>>,
  operation: () => void,
): void {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    operation();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("integration tests stop when TEST_DATABASE_URL is missing", () => {
  withEnvironment({ TEST_DATABASE_URL: undefined }, () => {
    assert.throws(requireSafeTestDatabase, /TEST_DATABASE_URL is required/);
  });
});

test("guard rejects development database and production mode", () => {
  withEnvironment(
    {
      TEST_DATABASE_URL:
        "postgresql://user:password@localhost:5432/student_registration",
      NODE_ENV: "test",
    },
    () => assert.throws(requireSafeTestDatabase, /explicit test marker/),
  );

  withEnvironment(
    {
      TEST_DATABASE_URL:
        "postgresql://user:password@localhost:5432/student_registration_test",
      NODE_ENV: "production",
    },
    () => assert.throws(requireSafeTestDatabase, /NODE_ENV=production/),
  );
});

test("guard rejects the same target as DATABASE_URL and unapproved hosts", () => {
  const url =
    "postgresql://user:password@localhost:5432/student_registration_test";

  withEnvironment(
    {
      TEST_DATABASE_URL: url,
      DATABASE_URL: url,
      DEVELOPMENT_DATABASE_URL: url,
      NODE_ENV: "test",
    },
    () => assert.throws(requireSafeTestDatabase, /same database/),
  );

  withEnvironment(
    {
      TEST_DATABASE_URL:
        "postgresql://user:password@db.production.example:5432/student_registration_test",
      DATABASE_URL: undefined,
      DEVELOPMENT_DATABASE_URL: undefined,
      TEST_DATABASE_ALLOWED_HOSTS: undefined,
      NODE_ENV: "test",
    },
    () => assert.throws(requireSafeTestDatabase, /Refusing test database host/),
  );
});
