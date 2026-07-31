import assert from "node:assert/strict";
import { test } from "node:test";
import { validateRuntimeEnvironment } from "./runtime-environment";

const validStagingEnvironment: Readonly<Record<string, string | undefined>> = {
  APP_ENV: "staging",
  NODE_ENV: "production",
  DATABASE_URL:
    "postgresql://staging_app:secret@db.internal/student_registration_staging?sslmode=require",
  RATE_LIMIT_REDIS_REST_URL: "https://redis-staging.example.invalid",
  RATE_LIMIT_REDIS_REST_TOKEN: "secret",
  RATE_LIMIT_KEY_SECRET: "a-random-secret-with-at-least-32-characters",
  APP_BASE_URL: "https://staging.example.internal",
  STAGING_DATABASE_ALLOWED_HOSTS: "db.internal",
  STAGING_REDIS_ALLOWED_HOSTS: "redis-staging.example.invalid",
  RELEASE_SHA: "048e9757315388ae5b7bb292a27a14b99b117bf9",
  REQUEST_BODY_MAX_BYTES: "65536",
  LOG_LEVEL: "info",
};

const validDevelopmentEnvironment: Readonly<
  Record<string, string | undefined>
> = {
  APP_ENV: "development",
  NODE_ENV: "development",
  DATABASE_URL:
    "postgresql://local_app:local_password@localhost/student_registration",
  DEVELOPMENT_DATABASE_ALLOWED_NAMES: "student_registration",
};

test("local development accepts only a loopback development database", () => {
  assert.doesNotThrow(() =>
    validateRuntimeEnvironment(validDevelopmentEnvironment),
  );
  assert.doesNotThrow(() =>
    validateRuntimeEnvironment({
      ...validDevelopmentEnvironment,
      DATABASE_URL:
        "postgresql://local_app:local_password@[::1]/student_registration",
    }),
  );
  assert.throws(
    () =>
      validateRuntimeEnvironment({
        ...validDevelopmentEnvironment,
        DATABASE_URL:
          "postgresql://local_app:local_password@db.internal/student_registration",
      }),
    /loopback/i,
  );
  for (const override of [
    "host=db.internal",
    "hostaddr=203.0.113.10",
    "service=production",
    "dbname=student_registration_production",
  ]) {
    assert.throws(
      () =>
        validateRuntimeEnvironment({
          ...validDevelopmentEnvironment,
          DATABASE_URL: `${validDevelopmentEnvironment.DATABASE_URL}?${override}`,
        }),
      /target override/i,
    );
  }
  for (const database of [
    "student_registration_test",
    "student_registration_staging",
    "student_registration_production",
  ]) {
    assert.throws(
      () =>
        validateRuntimeEnvironment({
          ...validDevelopmentEnvironment,
          DATABASE_URL: `postgresql://local_app:local_password@localhost/${database}`,
        }),
      /development database/i,
    );
  }
  assert.throws(
    () =>
      validateRuntimeEnvironment({
        ...validDevelopmentEnvironment,
        NODE_ENV: "production",
      }),
    /NODE_ENV=development/,
  );
  assert.throws(
    () =>
      validateRuntimeEnvironment({
        ...validDevelopmentEnvironment,
        DEVELOPMENT_DATABASE_ALLOWED_NAMES: undefined,
      }),
    /DEVELOPMENT_DATABASE_ALLOWED_NAMES/,
  );
  assert.throws(
    () =>
      validateRuntimeEnvironment({
        ...validDevelopmentEnvironment,
        DATABASE_URL:
          "postgresql://local_app:local_password@localhost/another_local_database",
      }),
    /development database allowlist/i,
  );
});

test("staging configuration passes with isolated HTTPS services", () => {
  assert.doesNotThrow(() =>
    validateRuntimeEnvironment(validStagingEnvironment),
  );
});

test("staging fails fast for missing secrets or a non-staging database", () => {
  assert.throws(
    () =>
      validateRuntimeEnvironment({
        ...validStagingEnvironment,
        RATE_LIMIT_REDIS_REST_TOKEN: "",
      }),
    /RATE_LIMIT_REDIS_REST_TOKEN/,
  );
  assert.throws(
    () =>
      validateRuntimeEnvironment({
        ...validStagingEnvironment,
        DATABASE_URL: "postgresql://app:secret@db.internal/student_registration",
      }),
    /explicit staging database/,
  );
});

test("staging rejects insecure service URLs and unsafe body limits", () => {
  assert.throws(
    () =>
      validateRuntimeEnvironment({
        ...validStagingEnvironment,
        APP_BASE_URL: "http://staging.example.internal",
      }),
    /HTTPS/,
  );
  assert.throws(
    () =>
      validateRuntimeEnvironment({
        ...validStagingEnvironment,
        REQUEST_BODY_MAX_BYTES: "999999",
      }),
    /REQUEST_BODY_MAX_BYTES/,
  );
});

test("staging rejects database or Redis hosts outside explicit allowlists", () => {
  assert.throws(
    () =>
      validateRuntimeEnvironment({
        ...validStagingEnvironment,
        DATABASE_URL:
          "postgresql://staging_app:secret@production-db.internal/student_registration_staging",
      }),
    /database.*allowlist/i,
  );
  assert.throws(
    () =>
      validateRuntimeEnvironment({
        ...validStagingEnvironment,
        RATE_LIMIT_REDIS_REST_URL: "https://redis-other.example.invalid",
      }),
    /Redis host/,
  );
});

test("build and guarded local E2E modes do not require staging infrastructure", () => {
  assert.doesNotThrow(() =>
    validateRuntimeEnvironment({
      APP_ENV: "build",
      SHARE_LINK_BUILD_PHASE: "1",
    }),
  );
  assert.doesNotThrow(() =>
    validateRuntimeEnvironment({
      APP_ENV: "test",
      LOCAL_E2E_RUNTIME: "1",
      DATABASE_URL: "postgresql://localhost/student_registration_test",
    }),
  );
});

test("missing, unknown, or unguarded test APP_ENV fails closed", () => {
  assert.throws(() => validateRuntimeEnvironment({}), /APP_ENV/);
  assert.throws(
    () =>
      validateRuntimeEnvironment({
        APP_ENV: "development",
        NODE_ENV: "development",
      }),
    /DATABASE_URL/,
  );
  assert.throws(
    () =>
      validateRuntimeEnvironment({
        APP_ENV: "test",
        LOCAL_E2E_RUNTIME: "1",
        DATABASE_URL: "postgresql://localhost/student_registration",
      }),
    /APP_ENV/,
  );
});
