import assert from "node:assert/strict";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

export async function fillRequiredFirstPage(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  const change = (label: RegExp, value: string): void => {
    fireEvent.change(screen.getByLabelText(label), {
      target: { value },
    });
  };
  const choose = async (label: RegExp, option: string): Promise<void> => {
    await user.click(screen.getByRole("combobox", { name: label }));
    await user.click(screen.getByRole("option", { name: option }));
  };
  const chooseDayTen = async (label: RegExp): Promise<void> => {
    await user.click(screen.getByLabelText(label));
    const dayTen = screen
      .getAllByRole("button")
      .find((button) => button.getAttribute("data-day")?.startsWith("10/"));
    assert.ok(dayTen);
    await user.click(dayTen);
  };

  change(/Họ và tên/, "Nguyễn Văn A");
  await chooseDayTen(/Ngày sinh/);
  await choose(/Giới tính/, "Nam");
  await choose(/Nơi sinh/, "Vĩnh Long");
  change(/Dân tộc/, "Kinh");
  change(/Tôn giáo/, "Không");
  change(/Quốc tịch/, "Việt Nam");
  change(/^Số điện thoại/, "0912345678");
  change(/Email/, "nguyenvana@example.com");
  change(/CCCD/, "012345678901");
  await chooseDayTen(/Ngày cấp/);
  change(/Nơi cấp/, "Cục Cảnh sát quản lý hành chính");
  change(/Địa chỉ thường trú/, "Trà Vinh");
  change(/Địa chỉ liên hệ/, "Trà Vinh");
  await choose(/Bằng dùng để đăng ký xét tuyển/, "Trung học phổ thông");
  change(/Ngành tốt nghiệp/, "Công nghệ thông tin");
  change(/Năm tốt nghiệp/, "2024");
  change(/Tên trường THPT/, "THPT Trà Vinh");
  await choose(/Tỉnh\/thành phố của trường THPT/, "Vĩnh Long");
  const ward = screen.getByRole("combobox", {
    name: /Xã\/phường của trường THPT/,
  });
  await waitFor(() => assert.equal(ward.hasAttribute("disabled"), false));
  fireEvent.change(ward, { target: { value: "Phường 1" } });
}
