import { expect, test, type Page } from "@playwright/test";
import { withTestClient } from "../helpers/test-database";

const suffix = Date.now().toString(36).toUpperCase();
const periodCode = `E2E-P-${suffix}`;
const majorCode = `E2E-M-${suffix}`;

async function login(page: Page, username: string) {
  await page.goto("/dang-nhap");
  await page.getByLabel("Tên đăng nhập").fill(username);
  await page.getByLabel("Mật khẩu").fill("admin-test-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/quan-tri(?:\/lien-ket)?$/);
}

test.afterAll(async () => {
  await withTestClient(async (client) => {
    await client.query("DELETE FROM audit_logs WHERE entity_id IN (SELECT id FROM admission_periods WHERE code=$1)", [periodCode]);
    await client.query("DELETE FROM audit_logs WHERE entity_id IN (SELECT id FROM majors WHERE code=$1)", [majorCode]);
    await client.query("DELETE FROM admission_periods WHERE code=$1", [periodCode]);
    await client.query("DELETE FROM majors WHERE code=$1", [majorCode]);
  });
});

test("catalog UI enforces SALE/MANAGER read scope and ADMIN lifecycle mutations", async ({ page }) => {
  await login(page, "sale-test");
  await page.getByRole("link", { name: "Ngành học" }).click();
  await expect(page.getByText("TEST-01")).toBeVisible();
  await expect(page.getByText("TEST-99")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tạo ngành" })).toHaveCount(0);

  await page.context().clearCookies();
  await login(page, "manager-test");
  await page.getByRole("link", { name: "Ngành học" }).click();
  await expect(page.getByText("TEST-99")).toBeVisible();
  await expect(page.getByRole("button", { name: /Sửa|Kích hoạt|Tạm dừng/u })).toHaveCount(0);

  await page.context().clearCookies();
  await login(page, "admin");
  await page.getByRole("link", { name: "Ngành học" }).click();
  await page.getByLabel("Mã ngành").first().fill(` ${majorCode.toLowerCase()} `);
  await page.getByLabel("Tên ngành").first().fill("Ngành E2E quản trị");
  await page.getByLabel("Thứ tự").first().fill("3");
  await page.getByRole("button", { name: "Tạo ngành" }).click();
  const majorRow = page.getByRole("row").filter({ hasText: majorCode });
  await expect(majorRow).toBeVisible();
  await majorRow.getByRole("button", { name: "Kích hoạt" }).click();
  await expect(majorRow.getByText("Hoạt động")).toBeVisible();
  await majorRow.getByRole("button", { name: "Lịch sử" }).click();
  await expect(majorRow.getByText("MAJOR_ACTIVATED")).toBeVisible();

  await page.getByRole("link", { name: "Kỳ tuyển sinh" }).click();
  await page.getByLabel("Mã kỳ").first().fill(periodCode);
  await page.getByLabel("Tên kỳ").first().fill("Kỳ E2E tương lai");
  await page.getByLabel("Ngày bắt đầu").first().fill("2040-01-01");
  await page.getByLabel("Ngày kết thúc").first().fill("2040-03-31");
  await page.getByRole("button", { name: "Tạo kỳ" }).click();
  const periodRow = page.getByRole("row").filter({ hasText: periodCode });
  await expect(periodRow).toBeVisible();
  await periodRow.getByRole("button", { name: "Kích hoạt" }).click();
  await expect(periodRow.getByText("Hoạt động")).toBeVisible();
});
