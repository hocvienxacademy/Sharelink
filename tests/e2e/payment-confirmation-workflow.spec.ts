import { expect, test, type Page } from "@playwright/test";
import { TEST_IDS } from "../fixtures/test-data";
import { withTestClient } from "../helpers/test-database";

const LINK_ID = "40000000-0000-4000-8000-000000000031";
const TOKEN = "50000000-0000-4000-8000-000000000031";
const APPLICATION_ID = "60000000-0000-4000-8000-000000000031";
const PAYMENT_ID = "70000000-0000-4000-8000-000000000031";

test.beforeAll(async () => {
  await withTestClient(async (client) => {
    await client.query(
      `INSERT INTO registration_links (id, public_token, sale_id, admission_period_id, tuition_amount, status, expires_at)
       VALUES ($1,$2,$3,$4,'2500000.00','ACTIVE',CURRENT_TIMESTAMP + INTERVAL '1 day')`,
      [LINK_ID, TOKEN, TEST_IDS.sale, TEST_IDS.openPeriod],
    );
    await client.query(
      `INSERT INTO applications (id, registration_link_id, sale_id, admission_period_id, status, version, full_name)
       VALUES ($1,$2,$3,$4,'VALID',1,'Payment E2E Student')`,
      [APPLICATION_ID, LINK_ID, TEST_IDS.sale, TEST_IDS.openPeriod],
    );
    await client.query(
      `INSERT INTO payment_confirmations
       (id, application_id, bank_name, account_number, account_name, amount, transfer_content, status)
       VALUES ($1,$2,'E2E Bank','0123456789','E2E ACCOUNT','2500000.00','PAYMENT E2E','PENDING')`,
      [PAYMENT_ID, APPLICATION_ID],
    );
  });
});

test.afterAll(async () => {
  await withTestClient(async (client) => {
    await client.query("DELETE FROM audit_logs WHERE entity_id=$1", [PAYMENT_ID]);
    await client.query("DELETE FROM applications WHERE id=$1", [APPLICATION_ID]);
    await client.query("DELETE FROM registration_links WHERE id=$1", [LINK_ID]);
  });
});

async function login(page: Page, username: string) {
  await page.goto("/dang-nhap");
  await page.getByLabel("Tên đăng nhập").fill(username);
  await page.getByLabel("Mật khẩu").fill("admin-test-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/quan-tri(?:\/lien-ket)?$/);
}

test("SALE reads while MANAGER confirms and ADMIN terminally cancels payment", async ({ page }) => {
  await login(page, "sale-test");
  await page.goto(`/quan-tri/thanh-toan/${PAYMENT_ID}`);
  await expect(page.getByText("Tài khoản SALE chỉ được xem thông tin thanh toán trong phạm vi phụ trách.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Xác nhận thanh toán" })).toHaveCount(0);
  const forbidden = await page.evaluate(async (applicationId) => (await fetch(`/api/admin/applications/${applicationId}/payment/confirm`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ expectedStatus: "PENDING", expectedUpdatedAt: new Date().toISOString(), confirmationNote: null }),
  })).status, APPLICATION_ID);
  expect(forbidden).toBe(403);

  await page.context().clearCookies();
  await login(page, "manager-test");
  await page.goto(`/quan-tri/thanh-toan/${PAYMENT_ID}`);
  await page.getByLabel("Ghi chú xác nhận (không bắt buộc)").fill("Đã đối soát tại quầy");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Xác nhận thanh toán" }).click();
  await expect(page.getByText("Đã xác nhận", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Đã đối soát tại quầy").first()).toBeVisible();

  await page.context().clearCookies();
  await login(page, "admin");
  await page.goto(`/quan-tri/thanh-toan/${PAYMENT_ID}`);
  await page.getByLabel("Lý do hủy xác nhận").fill("Giao dịch ngân hàng bị hoàn");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Hủy xác nhận" }).click();
  await expect(page.getByText("Đã hủy", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Bản ghi đã hủy là trạng thái kết thúc và chỉ đọc.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Xác nhận thanh toán|Hủy xác nhận/u })).toHaveCount(0);

  const databaseState = await withTestClient(async (client) => ({
    applicationStatus: (await client.query("SELECT status FROM applications WHERE id=$1", [APPLICATION_ID])).rows[0].status,
    auditActions: (await client.query("SELECT action FROM audit_logs WHERE entity_id=$1 ORDER BY created_at", [PAYMENT_ID])).rows.map((row) => row.action),
    payment: (await client.query("SELECT status, confirmed_by, confirmation_note, cancelled_by, cancellation_reason FROM payment_confirmations WHERE id=$1", [PAYMENT_ID])).rows[0],
  }));
  expect(databaseState.applicationStatus).toBe("VALID");
  expect(databaseState.auditActions).toEqual(["PAYMENT_CONFIRMED", "PAYMENT_CONFIRMATION_CANCELLED"]);
  expect(databaseState.payment).toMatchObject({
    status: "CANCELLED", confirmed_by: TEST_IDS.manager, confirmation_note: "Đã đối soát tại quầy",
    cancelled_by: TEST_IDS.admin, cancellation_reason: "Giao dịch ngân hàng bị hoàn",
  });
});
