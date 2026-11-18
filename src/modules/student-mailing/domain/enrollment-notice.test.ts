import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_ENROLLMENT_NOTICE_SETTINGS,
  computeEnrollmentNoticeAmounts,
  formatNoticeAmount,
  formatNoticeDate,
  noticeDateParts,
} from "./enrollment-notice";

describe("enrollment notice", () => {
  it("computes tuition and total from credits, credit fee and the card fee", () => {
    assert.deepEqual(
      computeEnrollmentNoticeAmounts(
        { credits: 7, creditFee: 450_000 },
        DEFAULT_ENROLLMENT_NOTICE_SETTINGS,
      ),
      { tuition: 3_150_000, total: 3_250_000 },
    );
  });

  it("formats amounts and dates the way the printed notice does", () => {
    assert.equal(formatNoticeAmount(3_250_000), "3.250.000");
    assert.equal(formatNoticeAmount(100_000), "100.000");
    assert.equal(formatNoticeDate("2003-09-26"), "26/09/2003");
    assert.deepEqual(noticeDateParts("2026-10-19"), {
      day: "19",
      month: "10",
      year: "2026",
    });
  });
});
