import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AdmissionPeriodManagementPanel,
  MajorManagementPanel,
} from "./catalog-management-panels";

afterEach(() => {
  cleanup();
  mock.restoreAll();
});

function successfulResponse(data: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("catalog creation forms", () => {
  it("resets the major form after a successful asynchronous request", async () => {
    mock.method(globalThis, "fetch", () =>
      successfulResponse({
        id: "11111111-1111-4111-8111-111111111111",
        code: "MN01",
        name: "Luật",
        displayOrder: 1,
        isActive: false,
        updatedAt: "2026-08-25T00:00:00.000Z",
      }),
    );
    const user = userEvent.setup();
    render(<MajorManagementPanel initialItems={[]} canManage />);

    await user.type(screen.getByLabelText("Mã ngành"), "MN01");
    await user.type(screen.getByLabelText("Tên ngành"), "Luật");
    const order = screen.getByLabelText("Thứ tự") as HTMLInputElement;
    await user.clear(order);
    await user.type(order, "1");
    await user.click(screen.getByRole("button", { name: "Tạo ngành" }));

    assert.ok(await screen.findByText("Đã tạo ngành ở trạng thái tạm dừng."));
    assert.equal((screen.getByLabelText("Mã ngành") as HTMLInputElement).value, "");
    assert.equal((screen.getByLabelText("Tên ngành") as HTMLInputElement).value, "");
    assert.equal(order.value, "0");
  });

  it("resets the admission-period form after a successful asynchronous request", async () => {
    mock.method(globalThis, "fetch", () =>
      successfulResponse({
        id: "22222222-2222-4222-8222-222222222222",
        code: "2026-01",
        name: "Đợt 1 năm 2026",
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        isActive: false,
        updatedAt: "2026-08-25T00:00:00.000Z",
      }),
    );
    const user = userEvent.setup();
    render(<AdmissionPeriodManagementPanel initialItems={[]} canManage />);

    await user.type(screen.getByLabelText("Mã kỳ"), "2026-01");
    await user.type(screen.getByLabelText("Tên kỳ"), "Đợt 1 năm 2026");
    await user.type(screen.getByLabelText("Ngày bắt đầu"), "2026-08-01");
    await user.type(screen.getByLabelText("Ngày kết thúc"), "2026-08-31");
    await user.click(screen.getByRole("button", { name: "Tạo kỳ" }));

    assert.ok(await screen.findByText("Đã tạo kỳ tuyển sinh ở trạng thái tạm dừng."));
    assert.equal((screen.getByLabelText("Mã kỳ") as HTMLInputElement).value, "");
    assert.equal((screen.getByLabelText("Tên kỳ") as HTMLInputElement).value, "");
  });
});
