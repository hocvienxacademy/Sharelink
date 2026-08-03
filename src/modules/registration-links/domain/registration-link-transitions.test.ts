import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InvalidStateTransitionError } from "@/shared/errors";
import {
  assertRegistrationLinkTransition,
  registrationLinkTransitionTarget,
} from "./registration-link-transitions";

const now = new Date("2026-08-03T08:00:00.000Z");
const context = (status: "DRAFT" | "ACTIVE" | "LOCKED" | "SUBMITTED" | "EXPIRED" | "CANCELLED" | "ARCHIVED", overrides = {}) => ({
  status,
  now,
  expiresAt: new Date("2026-08-04T08:00:00.000Z"),
  applicationId: null,
  ...overrides,
});

describe("registration link transitions", () => {
  it("defines the verified happy-path graph", () => {
    assert.doesNotThrow(() => assertRegistrationLinkTransition("activate", context("DRAFT")));
    assert.doesNotThrow(() => assertRegistrationLinkTransition("lock", context("ACTIVE")));
    assert.doesNotThrow(() => assertRegistrationLinkTransition("unlock", context("LOCKED")));
    assert.doesNotThrow(() => assertRegistrationLinkTransition("cancel", context("ACTIVE")));
    assert.doesNotThrow(() => assertRegistrationLinkTransition("archive", context("CANCELLED")));
    assert.equal(registrationLinkTransitionTarget("lock"), "LOCKED");
  });

  it("denies repeats, expired unlock, applications, terminal and unsupported transitions", () => {
    for (const [action, value] of [
      ["activate", context("ACTIVE")],
      ["lock", context("LOCKED")],
      ["unlock", context("LOCKED", { expiresAt: now })],
      ["cancel", context("DRAFT", { applicationId: "application" })],
      ["archive", context("ACTIVE")],
      ["activate", context("ARCHIVED")],
      ["cancel", context("SUBMITTED")],
    ] as const) {
      assert.throws(() => assertRegistrationLinkTransition(action, value), InvalidStateTransitionError);
    }
  });
});
