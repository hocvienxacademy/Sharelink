import { expect, test, type Page } from "@playwright/test";
import { TEST_TOKENS } from "../fixtures/test-data";
import { withTestClient } from "../helpers/test-database";

const suffix = Date.now().toString().slice(-8);
const bankCode = `E2E${suffix.slice(-4)}`;
const accountNumber = `00${suffix}`;
let originalDefaultId: string | null = null;

async function login(page: Page, username: string) {
  await page.goto("/dang-nhap");
  await page.getByLabel("Tên đăng nhập").fill(username);
  await page.getByLabel("Mật khẩu").fill("admin-test-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/quan-tri(?:\/lien-ket)?$/);
}

test.beforeAll(async () => {
  await withTestClient(async (client) => {
    const result = await client.query<{ id: string }>("SELECT id FROM bank_accounts WHERE is_default=true");
    originalDefaultId = result.rows[0]?.id ?? null;
  });
});

test.afterAll(async () => {
  await withTestClient(async (client) => {
    const rows = await client.query<{ id: string }>("SELECT id FROM bank_accounts WHERE bank_code=$1", [bankCode]);
    const ids = rows.rows.map((row) => row.id);
    if (ids.length > 0) {
      await client.query("UPDATE bank_accounts SET is_default=false WHERE id=ANY($1::uuid[])", [ids]);
      await client.query("DELETE FROM audit_logs WHERE entity_id=ANY($1::uuid[])", [ids]);
      await client.query("DELETE FROM bank_accounts WHERE id=ANY($1::uuid[])", [ids]);
    }
    if (originalDefaultId !== null) await client.query("UPDATE bank_accounts SET is_default=true, is_active=true WHERE id=$1", [originalDefaultId]);
  });
});

test("bank account UI enforces staff visibility and ADMIN lifecycle", async ({ page }) => {
  await login(page, "admin");
  await page.getByRole("link", { name: "Ngân hàng" }).click();
  await page.getByLabel("Mã ngân hàng").first().fill(` ${bankCode.toLowerCase()} `);
  await page.getByLabel("Tên ngân hàng").first().fill("Ngân hàng E2E");
  await page.getByLabel("Chi nhánh").first().fill("Chi nhánh kiểm thử");
  await page.getByLabel("Số tài khoản").first().fill(accountNumber);
  await page.getByLabel("Tên chủ tài khoản").first().fill("TRUONG E2E");
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  const row = page.getByRole("row").filter({ hasText: bankCode });
  await expect(row).toBeVisible();
  await expect(row.getByText(accountNumber)).toBeVisible();
  await row.getByRole("button", { name: "Kích hoạt" }).click();
  await expect(row.getByText("Hoạt động")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "Đặt mặc định" }).click();
  await expect(row.getByText("Mặc định")).toBeVisible();
  await row.getByRole("button", { name: "Lịch sử" }).click();
  await expect(row.getByText("BANK_ACCOUNT_DEFAULT_CHANGED")).toBeVisible();

  await page.context().clearCookies();
  await login(page, "manager-test");
  await page.getByRole("link", { name: "Ngân hàng" }).click();
  const managerRow = page.getByRole("row").filter({ hasText: bankCode });
  await expect(managerRow).toBeVisible();
  await expect(managerRow.getByText(accountNumber)).toHaveCount(0);
  await expect(managerRow.getByRole("button", { name: /Sửa|Đặt mặc định|Lịch sử/u })).toHaveCount(0);

  await page.context().clearCookies();
  await page.goto(`/dang-ky/${TEST_TOKENS.active}`);
  await expect(page.getByText(accountNumber)).toBeVisible();
  await expect(page.getByText("TRUONG E2E")).toBeVisible();
});
