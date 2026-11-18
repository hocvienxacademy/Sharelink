import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDate, formatDateTime, formatMoney } from "./format";

const normalizeSpaces = (value: string) => value.replace(/\s/g, " ");

describe("shared display formatting", () => {
  it("prints date-only values in UTC so they never shift by a day", () => {
    assert.equal(formatDate("2026-08-01T00:00:00.000Z"), "01/08/2026");
    assert.equal(
      formatDate(new Date("2026-08-31T00:00:00.000Z")),
      "31/08/2026",
    );
  });

  it("prints moments in Vietnam time", () => {
    // 17:30 UTC is 00:30 the next day in Asia/Ho_Chi_Minh (UTC+7).
    const text = formatDateTime("2026-10-15T17:30:00.000Z");
    assert.match(text, /00:30/);
    assert.match(text, /16\/10\/2026/);
  });

  it("formats VND from numbers and decimal strings", () => {
    assert.equal(normalizeSpaces(formatMoney(260000)), "260.000 ₫");
    assert.equal(normalizeSpaces(formatMoney("260000.00")), "260.000 ₫");
  });

  it("shows a dash for missing values", () => {
    assert.equal(formatDate(null), "—");
    assert.equal(formatDateTime(null), "—");
    assert.equal(formatMoney(null), "—");
  });
});
