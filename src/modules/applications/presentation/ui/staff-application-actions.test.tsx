import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { cleanup, render, screen } from "@testing-library/react";
import { StaffApplicationActionsView } from "./staff-application-actions";

function renderActions(canManage: boolean) {
  return render(
    <StaffApplicationActionsView
      canManage={canManage}
      email="student@example.com"
      fullName="Nguyễn Văn A"
      id="22222222-2222-4222-8222-222222222222"
      onRefresh={() => undefined}
      phone="0901234567"
      status="SUBMITTED"
      version={1}
    />,
  );
}

afterEach(cleanup);

describe("StaffApplicationActions", () => {
  it("lets a read-only SALE download Word without exposing mutation controls", () => {
    renderActions(false);

    assert.ok(screen.getByRole("button", { name: "Tải phiếu dự tuyển Word" }));
    assert.equal(screen.queryByRole("button", { name: "Lưu nội dung" }), null);
    assert.equal(screen.queryByRole("button", { name: "Yêu cầu bổ sung" }), null);
    assert.equal(screen.queryByRole("button", { name: "Xác nhận hợp lệ" }), null);
    assert.equal(screen.queryByLabelText("Họ và tên"), null);
  });

  it("keeps edit and review controls for staff with management permission", () => {
    renderActions(true);

    assert.ok(screen.getByRole("button", { name: "Tải phiếu dự tuyển Word" }));
    assert.ok(screen.getByRole("button", { name: "Lưu nội dung" }));
    assert.ok(screen.getByRole("button", { name: "Yêu cầu bổ sung" }));
    assert.ok(screen.getByRole("button", { name: "Xác nhận hợp lệ" }));
  });
});
