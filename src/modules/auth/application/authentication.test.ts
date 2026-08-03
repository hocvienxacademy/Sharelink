import test from "node:test";
import assert from "node:assert/strict";
import { authenticateAdmin, normalizeLoginUsername } from "./authentication";
import { UnauthorizedError } from "@/shared/errors";

test("admin authentication rejects the legacy email-shaped request contract", async () => {
  await assert.rejects(
    authenticateAdmin({ identifier: "admin@test.invalid", password: "password" }),
    UnauthorizedError,
  );
});

test("login username normalization is shared by authentication and rate limiting", () => {
  assert.equal(normalizeLoginUsername(" ADMIN "), "admin");
  assert.equal(normalizeLoginUsername("admin"), "admin");
  assert.equal(normalizeLoginUsername(""), null);
  assert.equal(normalizeLoginUsername("a".repeat(101)), null);
});
