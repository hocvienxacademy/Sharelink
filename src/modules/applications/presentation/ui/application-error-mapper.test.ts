import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapValidationIssues } from "./application-error-mapper";

describe("application validation error mapper", () => {
  it("maps multiple top-level and relative issues without dropping any", () => {
    const result = mapValidationIssues([
      {
        path: ["fullName"],
        code: "required",
        message: "Vui lòng nhập họ và tên.",
      },
      {
        path: ["relatives", 0, "phone"],
        code: "required",
        message: "Vui lòng nhập số điện thoại người thân.",
      },
      {
        path: ["relatives"],
        code: "maximum_relatives",
        message: "Chỉ được cung cấp tối đa hai người thân.",
      },
      {
        path: ["serverOnlyField"],
        code: "invalid",
        message: "Internal detail.",
      },
    ]);

    assert.deepEqual(result.fieldErrors, {
      fullName: ["Vui lòng nhập họ và tên."],
      "relatives.0.phone": ["Vui lòng nhập số điện thoại người thân."],
      relatives: ["Chỉ được cung cấp tối đa hai người thân."],
    });
    assert.equal(result.generalMessages.length, 1);
    assert.equal(result.firstField, "fullName");
  });

  it("uses field labels rather than sensitive values in the summary", () => {
    const sensitiveValue = "001234567890";
    const result = mapValidationIssues([
      {
        path: ["citizenId"],
        code: "invalid",
        message: `Giá trị ${sensitiveValue} không hợp lệ.`,
      },
    ]);

    assert.deepEqual(result.summaryItems, ["CCCD hoặc giấy tờ định danh"]);
    assert.equal(JSON.stringify(result.summaryItems).includes(sensitiveValue), false);
  });
});
