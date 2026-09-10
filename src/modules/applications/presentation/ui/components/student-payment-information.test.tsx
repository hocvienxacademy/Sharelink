import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { cleanup, render, screen } from "@testing-library/react";
import { StudentPaymentInformationPanel } from "./student-payment-information";

afterEach(cleanup);

describe("StudentPaymentInformationPanel", () => {
  it("shows payment information without a Word download code flow", () => {
    render(
      <StudentPaymentInformationPanel
        payment={{
          account: {
            bankCode: "VCB",
            bankName: "Vietcombank",
            branchName: "Trà Vinh",
            accountNumber: "0123456789",
            accountName: "TRƯỜNG ĐẠI HỌC TRÀ VINH",
          },
          applicationFeeAmount: 260_000,
          instructions: "Ghi rõ họ tên và mã hồ sơ.",
        }}
      />,
    );

    assert.ok(screen.getByText("Thông tin chuyển khoản"));
    assert.ok(screen.getByText("0123456789"));
    assert.ok(screen.getByRole("img", { name: "Mã QR chuyển khoản" }));
    assert.equal(screen.queryByRole("textbox"), null);
    assert.equal(screen.queryByRole("button", { name: /Tải file Word/ }), null);
  });
});
