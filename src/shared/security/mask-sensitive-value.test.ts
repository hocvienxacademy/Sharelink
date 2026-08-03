import assert from "node:assert/strict";
import test from "node:test";
import { maskSensitiveValue } from "./mask-sensitive-value";

test("masks sensitive values while retaining only the final four characters", () => {
  assert.equal(maskSensitiveValue("123456789012"), "••••••••9012");
  assert.equal(maskSensitiveValue("1234"), "••••");
  assert.equal(maskSensitiveValue(null), "—");
});
