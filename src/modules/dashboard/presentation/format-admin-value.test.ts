import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { maskAccountNumber, maskCitizenId } from "./format-admin-value";

describe("admin value masking", () => {
  it("keeps only the last four account digits", () => {
    assert.equal(maskAccountNumber("1234567890"), "••••••7890");
  });

  it("does not reveal a complete citizen identifier", () => {
    const masked = maskCitizenId("012345678901");
    assert.equal(masked.endsWith("8901"), true);
    assert.equal(masked.includes("01234567"), false);
  });

  it("handles absent or unusually short identifiers safely", () => {
    assert.equal(maskCitizenId(null), "—");
    assert.equal(maskCitizenId("123"), "—");
    assert.equal(maskAccountNumber("123"), "••••");
  });
});
