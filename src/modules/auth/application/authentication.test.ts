import assert from "node:assert/strict";
import test from "node:test";
import { resolveAdminLoginEmail } from "./authentication";

test("development admin alias resolves only to the configured local admin email", () => {
  assert.equal(
    resolveAdminLoginEmail(" ADMIN ", {
      APP_ENV: "development",
      LOCAL_ADMIN_USERNAME: "admin",
      LOCAL_ADMIN_EMAIL: "admin@local.test",
    }),
    "admin@local.test",
  );
  assert.equal(
    resolveAdminLoginEmail("admin", {
      APP_ENV: "staging",
      LOCAL_ADMIN_USERNAME: "admin",
      LOCAL_ADMIN_EMAIL: "admin@local.test",
    }),
    "admin",
  );
});
