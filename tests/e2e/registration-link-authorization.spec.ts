import { expect, test, type Page } from "@playwright/test";
import { withTestClient } from "../helpers/test-database";

const OUTSIDE_SALE_ID = "10000000-0000-4000-8000-000000000011";
const OUTSIDE_LINK_ID = "40000000-0000-4000-8000-000000000011";
const OUTSIDE_APPLICATION_ID = "60000000-0000-4000-8000-000000000011";
const SALE_APPLICATION_ID = "60000000-0000-4000-8000-000000000012";
const SALE_APPLICATION_LINK_ID = "40000000-0000-4000-8000-000000000012";

test.beforeAll(async () => {
  await withTestClient(async (client) => {
    await client.query(
      `INSERT INTO users (id, username, full_name, email, password_hash, role)
       VALUES ($1, 'outside-sale', 'Outside Sale', 'outside-sale@test.invalid', 'not-a-login-hash', 'SALE')`,
      [OUTSIDE_SALE_ID],
    );
    await client.query(
      `INSERT INTO registration_links (id, sale_id, created_by, status)
       VALUES ($1, $2, $2, 'DRAFT')`,
      [OUTSIDE_LINK_ID, OUTSIDE_SALE_ID],
    );
    await client.query(
      `INSERT INTO applications (id, registration_link_id, sale_id)
       VALUES ($1, $2, $3)`,
      [OUTSIDE_APPLICATION_ID, OUTSIDE_LINK_ID, OUTSIDE_SALE_ID],
    );
    await client.query(
      `INSERT INTO registration_links (id, sale_id, created_by, status)
       VALUES ($1, $2, $2, 'DRAFT')`,
      [SALE_APPLICATION_LINK_ID, "10000000-0000-4000-8000-000000000001"],
    );
    await client.query(
      `INSERT INTO applications (id, registration_link_id, sale_id)
       VALUES ($1, $2, $3)`,
      [SALE_APPLICATION_ID, SALE_APPLICATION_LINK_ID, "10000000-0000-4000-8000-000000000001"],
    );
  });
});

test.afterAll(async () => {
  await withTestClient(async (client) => {
    await client.query("DELETE FROM applications WHERE id = $1", [SALE_APPLICATION_ID]);
    await client.query("DELETE FROM registration_links WHERE id = $1", [SALE_APPLICATION_LINK_ID]);
    await client.query("DELETE FROM applications WHERE id = $1", [OUTSIDE_APPLICATION_ID]);
    await client.query("DELETE FROM audit_logs WHERE entity_type = 'registration_links' AND entity_id IN (SELECT id FROM registration_links WHERE sale_id = $1)", [OUTSIDE_SALE_ID]);
    await client.query("DELETE FROM registration_link_status_histories WHERE registration_link_id IN (SELECT id FROM registration_links WHERE sale_id = $1)", [OUTSIDE_SALE_ID]);
    await client.query("DELETE FROM registration_links WHERE sale_id = $1", [OUTSIDE_SALE_ID]);
    await client.query("DELETE FROM users WHERE id = $1", [OUTSIDE_SALE_ID]);
  });
});

async function login(page: Page, username: string) {
  await page.goto("/dang-nhap");
  await page.getByLabel("Tên đăng nhập").fill(username);
  await page.getByLabel("Mật khẩu").fill("admin-test-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/quan-tri(?:\/lien-ket)?$/);
}

test("SALE creates self-owned links but cannot assign them to another user", async ({ page }) => {
  await login(page, "sale-test");
  await expect(page.getByRole("link", { name: "Liên kết", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Nhân sự" })).toHaveCount(0);
  await page.getByRole("button", { name: "Tạo liên kết" }).click();
  await expect(page.getByLabel("SALE phụ trách *")).toBeDisabled();
  const majorValue = await page.getByLabel("Ngành học").locator("option", { hasText: "TEST-01" }).getAttribute("value");
  await page.getByLabel("Ngành học").selectOption(majorValue ?? "");
  await page.getByRole("button", { name: "Tạo liên kết" }).click();
  await expect(page).toHaveURL(/\/quan-tri\/lien-ket\/[0-9a-f-]{36}$/);
  const createdId = page.url().split("/").at(-1);
  expect(createdId).toMatch(/^[0-9a-f-]{36}$/);
  await expect(page.getByRole("button", { name: "Sao chép URL" })).toHaveCount(0);
  const outsideLinkStatus = await page.evaluate(async (id) => (await fetch(`/api/admin/registration-links/${id}`)).status, OUTSIDE_LINK_ID);
  expect(outsideLinkStatus).toBe(403);
  const outsideApplicationResponse = await page.goto(`/quan-tri/ho-so/${OUTSIDE_APPLICATION_ID}`);
  expect(outsideApplicationResponse?.status()).toBe(404);
  await page.goto(`/quan-tri/lien-ket/${createdId}`);

  const status = await page.evaluate(async () => (await fetch("/api/admin/registration-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      saleId: "10000000-0000-4000-8000-000000000002",
      majorId: null,
      studentNameHint: null,
      entryQualification: null,
      paymentRound: null,
      internalNote: null,
      expiresAt: null,
    }),
  })).status);
  expect(status).toBe(403);

  const applicationPatchStatus = await page.evaluate(async (applicationId) => (await fetch(
    `/api/admin/applications/${applicationId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: "Forbidden" }),
    },
  )).status, SALE_APPLICATION_ID);
  expect(applicationPatchStatus).toBe(403);

  page.on("dialog", (dialog) => dialog.accept("SALE lifecycle test"));
  await page.getByRole("button", { name: "Kích hoạt" }).click();
  await expect(page.getByRole("button", { name: "Sao chép URL" })).toBeVisible();
  await page.getByRole("button", { name: "Khóa" }).click();
  await expect(page.getByRole("button", { name: "Mở khóa" })).toBeVisible();
  await page.getByRole("button", { name: "Mở khóa" }).click();
  await expect(page.getByRole("button", { name: "Khóa" })).toBeVisible();
  await page.getByRole("button", { name: "Hủy" }).click();
  await expect(page.getByText("Đã hủy", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Lưu trữ" }).click();
  await expect(page.getByText("Lưu trữ", { exact: true })).toBeVisible();
  const canReadArchived = await page.evaluate(async (id) => {
    const response = await fetch("/api/admin/registration-links?includeArchived=true");
    const body = await response.json() as { data: readonly { id: string }[] };
    return response.status === 200 && body.data.some((item) => item.id === id);
  }, createdId);
  expect(canReadArchived).toBe(true);

  await page.goto("/quan-tri/ho-so");
  await expect(page.getByRole("heading", { name: "Hồ sơ sinh viên" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/dang-nhap$/);
  const afterLogoutStatus = await page.evaluate(async () => (await fetch("/api/admin/registration-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })).status);
  expect(afterLogoutStatus).toBe(401);
});

test("MANAGER has direct-report read scope without ADMIN navigation", async ({ page }) => {
  await login(page, "manager-test");
  await expect(page.getByText("Test Sale").first()).toBeVisible();
  await page.getByRole("link", { name: "Nhân sự" }).click();
  await expect(page.getByRole("heading", { name: "Nhân sự" })).toBeVisible();
  await expect(page.getByText("Test Sale", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tạo tài khoản" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tạo tài khoản" })).toHaveCount(0);
  await page.getByRole("link", { name: "Hồ sơ" }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ sinh viên" })).toBeVisible();
  const outsideApplicationResponse = await page.goto(`/quan-tri/ho-so/${OUTSIDE_APPLICATION_ID}`);
  expect(outsideApplicationResponse?.status()).toBe(404);
  await page.goto("/quan-tri/ho-so");
  const status = await page.evaluate(async () => (await fetch("/api/admin/registration-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })).status);
  expect(status).toBe(403);
});

test("ADMIN creates and activates a registration link through the UI", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/quan-tri/lien-ket/tao-moi");
  const saleValue = await page.getByLabel("SALE phụ trách *").locator("option", { hasText: "Test Sale" }).getAttribute("value");
  await page.getByLabel("SALE phụ trách *").selectOption(saleValue ?? "");
  const majorValue = await page.getByLabel("Ngành học").locator("option", { hasText: "TEST-01" }).getAttribute("value");
  await page.getByLabel("Ngành học").selectOption(majorValue ?? "");
  await page.getByLabel("Gợi ý tên sinh viên").fill("E2E Lifecycle");
  await page.getByRole("button", { name: "Tạo liên kết" }).click();
  await expect(page).toHaveURL(/\/quan-tri\/lien-ket\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Kích hoạt" }).click();
  await expect(page.getByText("Hoạt động", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sao chép URL" })).toBeVisible();

  const secondTab = await page.context().newPage();
  await secondTab.goto(page.url());
  page.on("dialog", (dialog) => dialog.accept("ADMIN lifecycle test"));
  secondTab.on("dialog", (dialog) => dialog.accept("stale tab"));
  await page.getByRole("button", { name: "Khóa" }).click();
  await expect(page.getByRole("button", { name: "Mở khóa" })).toBeVisible();
  await secondTab.getByRole("button", { name: "Khóa" }).click();
  await expect(secondTab.getByText("Trạng thái vừa thay đổi. Trang sẽ tải lại dữ liệu mới nhất.")).toBeVisible();
  await expect(secondTab.getByRole("button", { name: "Mở khóa" })).toBeVisible();
  await secondTab.close();

  await page.getByRole("button", { name: "Mở khóa" }).click();
  await expect(page.getByRole("button", { name: "Khóa" })).toBeVisible();
  await page.getByRole("button", { name: "Hủy" }).click();
  await expect(page.getByRole("button", { name: "Lưu trữ" })).toBeVisible();
  await page.getByRole("button", { name: "Lưu trữ" }).click();
  await expect(page.getByText("ACTIVE → LOCKED", { exact: true })).toBeVisible();
  await expect(page.getByText("LOCKED → ACTIVE", { exact: true })).toBeVisible();
  await expect(page.getByText("CANCELLED → ARCHIVED", { exact: true })).toBeVisible();
});
