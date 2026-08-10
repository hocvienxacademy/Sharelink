import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applicationRelativeInputSchema,
  createDraftApplicationSchema,
  WORD_EXPORT_TEXT_LIMITS,
} from "./application-schemas";

describe("Word export text capacity validation", () => {
  it("accepts values at the printable one-page boundary", () => {
    const result = createDraftApplicationSchema.safeParse({
      fullName: "A".repeat(WORD_EXPORT_TEXT_LIMITS.fullName),
      permanentAddress: "A".repeat(WORD_EXPORT_TEXT_LIMITS.permanentAddress),
      contactAddress: "A".repeat(WORD_EXPORT_TEXT_LIMITS.contactAddress),
      workplace: "A".repeat(WORD_EXPORT_TEXT_LIMITS.workplace),
    });
    assert.equal(result.success, true);
  });

  it("rejects text that cannot fit the one-page Word template", () => {
    const result = createDraftApplicationSchema.safeParse({
      permanentAddress: "A".repeat(WORD_EXPORT_TEXT_LIMITS.permanentAddress + 1),
    });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.deepEqual(result.error.issues[0]?.path, ["permanentAddress"]);
    }
  });

  it("applies the printable boundary to a relative address", () => {
    const result = applicationRelativeInputSchema.safeParse({
      position: 1,
      address: "A".repeat(WORD_EXPORT_TEXT_LIMITS.relativeAddress + 1),
    });
    assert.equal(result.success, false);
  });

  it("rejects embedded line breaks that could force a second Word page", () => {
    const result = createDraftApplicationSchema.safeParse({
      permanentAddress: "Dòng một\nDòng hai",
    });
    assert.equal(result.success, false);
  });
});
