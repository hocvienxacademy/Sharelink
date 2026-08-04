import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ValidationError } from "@/shared/errors";
import { parseCancelPayment, parseConfirmPayment } from "./payment-schemas";

const expectedUpdatedAt = "2026-08-04T08:00:00.000Z";

describe("payment input schemas", () => {
  it("normalizes an optional confirmation note without accepting client amount fields", () => {
    assert.deepEqual(parseConfirmPayment({ expectedStatus: "PENDING", expectedUpdatedAt, confirmationNote: "   " }), {
      expectedStatus: "PENDING", expectedUpdatedAt, confirmationNote: null,
    });
    assert.throws(() => parseConfirmPayment({ expectedStatus: "PENDING", expectedUpdatedAt, amount: "100" }), ValidationError);
  });

  it("rejects HTML in notes and cancellation reasons", () => {
    assert.throws(() => parseConfirmPayment({ expectedStatus: "PENDING", expectedUpdatedAt, confirmationNote: "<b>paid</b>" }), ValidationError);
    assert.throws(() => parseCancelPayment({ expectedStatus: "CONFIRMED", expectedUpdatedAt, reason: "<script>x</script>" }), ValidationError);
  });

  it("requires a trimmed cancellation reason no longer than 2000 characters", () => {
    assert.throws(() => parseCancelPayment({ expectedStatus: "CONFIRMED", expectedUpdatedAt, reason: "   " }), ValidationError);
    assert.throws(() => parseCancelPayment({ expectedStatus: "CONFIRMED", expectedUpdatedAt, reason: "x".repeat(2001) }), ValidationError);
    assert.equal(parseCancelPayment({ expectedStatus: "CONFIRMED", expectedUpdatedAt, reason: "  duplicate  " }).reason, "duplicate");
  });
});
