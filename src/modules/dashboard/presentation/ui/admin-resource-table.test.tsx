import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { render, screen } from "@testing-library/react";
import { AdminResourceTable } from "./admin-resource-table";

describe("AdminResourceTable", () => {
  it("keeps one accessible action and labels every mobile data cell", () => {
    render(
      <AdminResourceTable
        columns={[
          { key: "name", label: "Họ tên" },
          { key: "status", label: "Trạng thái" },
          { key: "action", label: "" },
        ]}
        emptyDescription="Danh sách nhân sự"
        rows={[
          {
            id: "user-1",
            name: "Nguyễn Văn A",
            status: "Hoạt động",
            action: <button type="button">Xem chi tiết</button>,
          },
        ]}
      />,
    );

    assert.equal(screen.getAllByRole("button", { name: "Xem chi tiết" }).length, 1);
    assert.equal(screen.getByText("Nguyễn Văn A").closest("td")?.dataset.label, "Họ tên");
    assert.equal(screen.getByText("Hoạt động").closest("td")?.dataset.label, "Trạng thái");
    assert.equal(
      screen.getByRole("button", { name: "Xem chi tiết" }).closest("td")?.dataset.label,
      "Thao tác",
    );
  });
});
