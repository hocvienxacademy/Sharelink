import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ValidationError } from "@/shared/errors";
import { parseRequestRevision, parseStaffReviewApplication, parseStaffUpdateApplication } from "./staff-application-schemas";

describe("staff application validation", () => {
  it("trims and accepts a plain-text revision reason", () => {
    assert.equal(parseRequestRevision({ expectedVersion: 1, expectedStatus: "SUBMITTED", reason: "  Bổ sung CCCD  " }).reason, "Bổ sung CCCD");
  });
  it("rejects blank, overlong and HTML revision reasons", () => {
    for (const reason of ["   ", "a".repeat(2001), "<b>Không hợp lệ</b>"]) {
      assert.throws(() => parseRequestRevision({ expectedVersion: 1, expectedStatus: "SUBMITTED", reason }), ValidationError);
    }
  });
  it("rejects server-owned fields and arbitrary status", () => {
    assert.throws(() => parseStaffUpdateApplication({ expectedVersion: 1, status: "VALID" }), ValidationError);
    assert.throws(() => parseStaffUpdateApplication({ expectedVersion: 1 }), ValidationError);
    assert.throws(() => parseStaffReviewApplication({ expectedVersion: 1, expectedStatus: "DRAFT", reviewerId: "x" }), ValidationError);
  });
});
