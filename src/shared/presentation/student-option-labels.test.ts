import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatAdmissionQualification,
  formatGender,
} from "./student-option-labels";

describe("student option labels", () => {
  it("formats stored gender and qualification values in Vietnamese", () => {
    assert.equal(formatGender("FEMALE"), "Nữ");
    assert.equal(formatAdmissionQualification("THPT"), "Trung học phổ thông");
  });

  it("does not expose an unknown technical value", () => {
    assert.equal(formatGender("UNEXPECTED"), "Không xác định");
    assert.equal(formatAdmissionQualification("UNEXPECTED"), "Không xác định");
    assert.equal(formatGender(null), null);
  });
});
