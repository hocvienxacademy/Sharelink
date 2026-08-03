import assert from "node:assert/strict";
import test from "node:test";
import {
  hashPassword,
  verifyPassword,
  verifyPasswordOrDummy,
} from "./password";

test("password hash can verify the original password without storing plaintext", async () => {
  const encoded = await hashPassword("local-admin-password");

  assert.equal(encoded.includes("local-admin-password"), false);
  assert.equal(await verifyPassword("local-admin-password", encoded), true);
  assert.equal(await verifyPassword("wrong-password", encoded), false);
});

test("password verification rejects malformed hashes safely", async () => {
  assert.equal(await verifyPassword("password", "not-a-supported-hash"), false);
});

test("password verification propagates operational crypto failures", async () => {
  const encoded = await hashPassword("local-admin-password");

  await assert.rejects(
    verifyPasswordOrDummy(
      "local-admin-password",
      encoded,
      async () => {
        throw new Error("crypto unavailable");
      },
    ),
    /crypto unavailable/,
  );
});
