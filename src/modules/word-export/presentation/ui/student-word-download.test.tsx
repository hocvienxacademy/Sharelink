import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { cleanup, render, screen } from "@testing-library/react";
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
});
