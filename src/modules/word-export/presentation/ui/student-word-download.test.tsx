import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudentWordDownload } from "./student-word-download";

afterEach(cleanup);

describe("StudentWordDownload", () => {
  it("shows the one-time code immediately after submission", () => {
    render(<StudentWordDownload token="11111111-1111-4111-8111-111111111111" initialCode="ASNFZ4mrze8BI0VniavN7w" />);
    assert.ok(screen.getByText("ASNFZ4mrze8BI0VniavN7w"));
    assert.equal((screen.getByLabelText("Mã tải phiếu Word") as HTMLInputElement).value, "ASNFZ4mrze8BI0VniavN7w");
    assert.ok(screen.getByRole("button", { name: /Tải file Word/ }));
  });

  it("allows a returning student to enter the saved code", () => {
    render(<StudentWordDownload token="11111111-1111-4111-8111-111111111111" />);
    assert.equal((screen.getByLabelText("Mã tải phiếu Word") as HTMLInputElement).value, "");
    assert.equal((screen.getByRole("button", { name: /Tải file Word/ }) as HTMLButtonElement).disabled, true);
  });

  it("requires acknowledgement of transfer details before downloading", async () => {
    const user = userEvent.setup();
    render(
      <StudentWordDownload
        token="11111111-1111-4111-8111-111111111111"
        initialCode="ASNFZ4mrze8BI0VniavN7w"
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
    const qrCode = screen.getByRole("img", {
      name: "Mã QR chuyển khoản",
    });
    assert.equal(qrCode.getAttribute("src")?.includes("/images/QR.png"), true);
    assert.ok(screen.getByText("0123456789"));
    assert.ok(screen.getByText(/260\.000/));
    const download = screen.getByRole("button", { name: /Tải file Word/ });
    assert.equal((download as HTMLButtonElement).disabled, true);

    await user.click(
      screen.getByRole("button", {
        name: "Tôi đã đọc và lưu lại thông tin",
      }),
    );
    assert.equal((download as HTMLButtonElement).disabled, false);
  });
});
