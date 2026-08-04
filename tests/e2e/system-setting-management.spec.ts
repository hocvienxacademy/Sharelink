import { expect, test, type Page } from "@playwright/test";
import { TEST_TOKENS } from "../fixtures/test-data";
import { withTestClient } from "../helpers/test-database";

async function login(page: Page, username: string) {
  await page.goto("/dang-nhap");
  await page.getByLabel("Tên đăng nhập").fill(username);
  await page.getByLabel("Mật khẩu").fill("admin-test-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/quan-tri(?:\/lien-ket)?$/);
}

test.beforeAll(async () => {
  await withTestClient(async (client) => {
    await client.query(`INSERT INTO system_settings (setting_key, setting_value, description)
      VALUES
        ('payment.instructions', '{"message":"Hướng dẫn E2E ban đầu.","requireReceiptUpload":false}'::jsonb, 'Hướng dẫn thanh toán'),
        ('payment.transfer_content', '{"prefix":"INTERNAL-E2E-SECRET"}'::jsonb, 'Nội dung chuyển khoản'),
        ('registration.link_policy', '{"internal":"INTERNAL-POLICY-SECRET"}'::jsonb, 'Chính sách liên kết')
      ON CONFLICT (setting_key) DO NOTHING`);
  });
});

test.afterAll(async () => {
  await withTestClient(async (client) => {
    await client.query("DELETE FROM audit_logs WHERE action='SYSTEM_SETTING_UPDATED'");
    await client.query("DELETE FROM system_settings WHERE setting_key IN ('payment.instructions','payment.transfer_content','registration.link_policy')");
  });
});

test("ADMIN updates public instructions while internal values and staff mutations stay denied", async ({ page }) => {
  await login(page, "admin");
  await page.getByRole("link", { name: "Cài đặt" }).click();
  await expect(page.getByRole("heading", { name: "Cài đặt hệ thống" })).toBeVisible();
  const adminList = await page.request.get("/api/admin/system-settings");
  expect(adminList.status()).toBe(200);
  const adminBody = await adminList.text();
  expect(adminBody).not.toContain("INTERNAL-E2E-SECRET");
  expect(adminBody).not.toContain("INTERNAL-POLICY-SECRET");
  await page.getByLabel("Nội dung hướng dẫn").fill("Thanh toán theo hướng dẫn E2E mới.");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByText("Đã cập nhật hướng dẫn thanh toán.")).toBeVisible();
  await page.getByRole("button", { name: "Lịch sử" }).click();
  await expect(page.getByText("payment.instructions.message")).toBeVisible();
  const unknown = await page.request.patch("/api/admin/system-settings/secret.api_key", {
    data: { message: "x", expectedUpdatedAt: new Date().toISOString() },
    headers: { Origin: "http://127.0.0.1:3100", "Sec-Fetch-Site": "same-origin" },
  });
  expect(unknown.status()).toBe(422);

  await page.context().clearCookies();
  await page.goto(`/dang-ky/${TEST_TOKENS.active}`);
  await expect(page.getByText("Thanh toán theo hướng dẫn E2E mới.")).toBeVisible();

  for (const username of ["manager-test", "sale-test"]) {
    await page.context().clearCookies();
    await login(page, username);
    await expect(page.getByRole("link", { name: "Cài đặt" })).toHaveCount(0);
    const denied = await page.request.get("/api/admin/system-settings");
    expect(denied.status()).toBe(403);
  }
});
