import { expect, test, type Page } from "@playwright/test";
import { TEST_IDS } from "../fixtures/test-data";
import { withTestClient } from "../helpers/test-database";

const LINK_ID = "40000000-0000-4000-8000-000000000021";
const TOKEN = "50000000-0000-4000-8000-000000000021";
const APPLICATION_ID = "60000000-0000-4000-8000-000000000021";

test.beforeAll(async () => {
  await withTestClient(async (client) => {
    await client.query(
      `INSERT INTO registration_links (id, public_token, sale_id, admission_period_id, status, expires_at)
       VALUES ($1, $2, $3, $4, 'ACTIVE', CURRENT_TIMESTAMP + INTERVAL '1 day')`,
      [LINK_ID, TOKEN, TEST_IDS.sale, TEST_IDS.openPeriod],
    );
    await client.query(
      `INSERT INTO applications (
         id, registration_link_id, sale_id, admission_period_id, status, version, submitted_at,
         full_name, gender, date_of_birth, place_of_birth, ethnicity, religion, nationality,
         citizen_id, citizen_id_issued_date, citizen_id_issued_place, permanent_address,
         phone, email, contact_address, entry_qualification, admission_diploma, graduate_major,
         graduation_year, high_school_name, high_school_ward, high_school_province,
         declaration_place, declaration_date, declaration_confirmed, data_processing_consent
       ) VALUES (
         $1,$2,$3,$4,'SUBMITTED',1,CURRENT_TIMESTAMP,
         'Review Student','MALE','2005-01-02','Hà Nội','Kinh','Không','Việt Nam',
         '001234567890','2021-01-02','Hà Nội','Hà Nội',
         '0901234567','student@test.invalid','Hà Nội','THPT','THPT','Trung học phổ thông',
         2023,'THPT A','Phường A','Hà Nội','Hà Nội',CURRENT_DATE,true,true
       )`,
      [APPLICATION_ID, LINK_ID, TEST_IDS.sale, TEST_IDS.openPeriod],
    );
  });
});

test.afterAll(async () => {
  await withTestClient(async (client) => {
    await client.query("DELETE FROM audit_logs WHERE entity_type = 'application' AND entity_id = $1", [APPLICATION_ID]);
    await client.query("DELETE FROM applications WHERE id = $1", [APPLICATION_ID]);
    await client.query("DELETE FROM registration_links WHERE id = $1", [LINK_ID]);
  });
});

async function login(page: Page, username: string) {
  await page.goto("/dang-nhap");
  await page.getByLabel("Tên đăng nhập").fill(username);
  await page.getByLabel("Mật khẩu").fill("admin-test-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/quan-tri(?:\/lien-ket)?$/);
}

test("staff review, student resubmission, and VALID remain scoped and transactional", async ({ page }) => {
  await login(page, "sale-test");
  await page.goto(`/quan-tri/ho-so/${APPLICATION_ID}`);
  await expect(page.getByText("SALE chỉ có quyền đọc hồ sơ sinh viên.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Lưu nội dung" })).toHaveCount(0);
  const forbidden = await page.evaluate(async (id) => (await fetch(`/api/admin/applications/${id}/request-revision`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ expectedVersion: 1, expectedStatus: "SUBMITTED", reason: "Blocked" }),
  })).status, APPLICATION_ID);
  expect(forbidden).toBe(403);

  await page.context().clearCookies();
  await login(page, "manager-test");
  await page.goto(`/quan-tri/ho-so/${APPLICATION_ID}`);
  await page.getByLabel("Họ và tên").fill("Review Student Updated");
  await page.getByRole("button", { name: "Lưu nội dung" }).click();
  await expect(page.getByText("Review Student Updated").first()).toBeVisible();
  await page.getByLabel("Nội dung yêu cầu bổ sung").fill("Vui lòng kiểm tra lại số điện thoại.");
  await page.getByRole("button", { name: "Yêu cầu bổ sung" }).click();
  await expect(page.getByText("Cần bổ sung", { exact: true })).toBeVisible();
  await expect(page.getByText("Vui lòng kiểm tra lại số điện thoại.")).toBeVisible();

  await page.context().clearCookies();
  await page.goto(`/dang-ky/${TOKEN}/ho-so/${APPLICATION_ID}`);
  await expect(page.getByText("Hồ sơ cần bổ sung")).toBeVisible();
  await expect(page.getByText("Vui lòng kiểm tra lại số điện thoại.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Lưu bản nháp" })).toBeVisible();
  const resubmitStatus = await page.evaluate(async ({ token, id }) => {
    const current = await fetch(`/api/registration-links/${token}/applications/${id}`);
    const currentBody = await current.json() as { data: { version: number } };
    const updated = await fetch(`/api/registration-links/${token}/applications/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ expectedVersion: currentBody.data.version, phone: "0907654321" }),
    });
    const updatedBody = await updated.json() as { data: { version: number } };
    return (await fetch(`/api/registration-links/${token}/applications/${id}/submit`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ expectedVersion: updatedBody.data.version }),
    })).status;
  }, { token: TOKEN, id: APPLICATION_ID });
  expect(resubmitStatus).toBe(200);
  await page.reload();
  await expect(page.getByText("Hồ sơ không còn ở trạng thái bản nháp")).toBeVisible();

  await login(page, "admin");
  await page.goto(`/quan-tri/ho-so/${APPLICATION_ID}`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Xác nhận hợp lệ" }).click();
  await expect(page.getByText("Hợp lệ", { exact: true })).toBeVisible();

  const databaseState = await withTestClient(async (client) => ({
    payments: Number((await client.query("SELECT count(*)::int AS count FROM payment_confirmations WHERE application_id = $1", [APPLICATION_ID])).rows[0]?.count),
    histories: Number((await client.query("SELECT count(*)::int AS count FROM application_status_histories WHERE application_id = $1", [APPLICATION_ID])).rows[0]?.count),
  }));
  expect(databaseState.payments).toBe(0);
  expect(databaseState.histories).toBe(3);
});
