import { expect, test } from "@playwright/test";
import { TEST_IDS } from "../fixtures/test-data";
import { withTestClient } from "../helpers/test-database";

const ADMIN_UI_APPLICATION_ID = "60000000-0000-4000-8000-000000000001";
const ADMIN_UI_PAYMENT_ID = "70000000-0000-4000-8000-000000000001";

async function seedAdminUiDetails(): Promise<void> {
  await withTestClient(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query(
        `INSERT INTO applications
           (id, registration_link_id, sale_id, application_code, status,
            admission_period_id, full_name, citizen_id)
         VALUES ($1, $2, $3, 'APP-UI-001', 'SUBMITTED', $4, 'Sinh viên kiểm thử', '012345678901')`,
        [ADMIN_UI_APPLICATION_ID, TEST_IDS.activeLink, TEST_IDS.sale, TEST_IDS.openPeriod],
      );
      await client.query(
        `INSERT INTO payment_confirmations
           (id, application_id, bank_name, account_number, account_name,
            amount, transfer_content, status)
         VALUES ($1, $2, 'Ngân hàng kiểm thử', '1234567890123456',
                 'SHARELINK STUDENT', 500000, 'APP-UI-001', 'PENDING')`,
        [ADMIN_UI_PAYMENT_ID, ADMIN_UI_APPLICATION_ID],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

async function cleanupAdminUiDetails(): Promise<void> {
  await withTestClient((client) =>
    client.query("DELETE FROM applications WHERE id = $1", [ADMIN_UI_APPLICATION_ID]).then(() => undefined),
  );
}

async function cleanupCreatedUser(email: string): Promise<void> {
  await withTestClient(async (client) => {
    const users = await client.query<{ id: string }>(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );
    for (const user of users.rows) {
      await client.query("DELETE FROM audit_logs WHERE entity_id = $1", [user.id]);
      await client.query("DELETE FROM users WHERE id = $1", [user.id]);
    }
  });
}

async function resetAdminLockout(): Promise<void> {
  await withTestClient(async (client) => {
    await client.query(
      `UPDATE users
       SET failed_login_attempts = 0, locked_until = NULL
       WHERE email = 'admin@test.invalid'`,
    );
  });
}

test("administrator can sign in, view aggregate dashboard, and sign out", async ({
  page,
}) => {
  const nativeButtonWarnings: string[] = [];
  const consoleMessages: string[] = [];
  page.on("console", (message) => {
    consoleMessages.push(message.text());
    if (message.text().includes("expected a native <button>")) {
      nativeButtonWarnings.push(message.text());
    }
  });

  await page.goto("/dang-nhap");

  await page.getByLabel("Tên đăng nhập").fill("admin");
  await page.getByLabel("Mật khẩu").fill("admin-test-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  await expect(page).toHaveURL(/\/quan-tri$/);
  expect(nativeButtonWarnings).toEqual([]);
  await expect(
    page.getByRole("heading", { name: /Chào Test Admin/ }),
  ).toBeVisible();
  await expect(page.getByText("Tổng hồ sơ", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Chào Test Admin/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    })),
  ).toEqual({ local: [], session: [] });

  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/dang-nhap$/);
  await page.goBack();
  await expect(page).not.toHaveURL(/\/quan-tri/);
  await expect(page.getByText("Tổng hồ sơ", { exact: true })).toHaveCount(0);
  await page.goto("/quan-tri");
  await expect(page).toHaveURL(/\/dang-nhap$/);
  expect(consoleMessages.some((message) => message.includes("admin-test-password"))).toBe(false);
});

test("administrator can open every read-only management surface", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await seedAdminUiDetails();
  try {

  await page.goto("/dang-nhap");
  await page.getByLabel("Tên đăng nhập").fill("admin");
  await page.getByLabel("Mật khẩu").fill("admin-test-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/quan-tri$/);

  for (const { route, title } of [
    { route: "/quan-tri/lien-ket", title: "Liên kết đăng ký" },
    { route: "/quan-tri/lien-ket/tao-moi", title: "Tạo liên kết" },
    { route: "/quan-tri/ho-so", title: "Hồ sơ sinh viên" },
    { route: "/quan-tri/thanh-toan", title: "Xác nhận thanh toán" },
    { route: "/quan-tri/nhan-su", title: "Nhân sự" },
    { route: "/quan-tri/nhan-su/moi", title: "Tạo tài khoản" },
    { route: "/quan-tri/ky-tuyen-sinh", title: "Kỳ tuyển sinh" },
    { route: "/quan-tri/nganh-hoc", title: "Ngành học" },
    { route: "/quan-tri/tai-khoan-ngan-hang", title: "Tài khoản ngân hàng" },
    { route: "/quan-tri/cai-dat", title: "Cài đặt hệ thống" },
    { route: "/quan-tri/nhat-ky", title: "Nhật ký hoạt động" },
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`${route.replaceAll("/", "\\/")}$`));
    await expect(page.locator("h1")).toContainText(title);
  }

  for (const { route, title } of [
    { route: `/quan-tri/lien-ket/${TEST_IDS.activeLink}`, title: "Chi tiết liên kết" },
    { route: `/quan-tri/ho-so/${ADMIN_UI_APPLICATION_ID}`, title: "Sinh viên kiểm thử" },
    { route: `/quan-tri/thanh-toan/${ADMIN_UI_PAYMENT_ID}`, title: "APP-UI-001" },
    { route: `/quan-tri/nhan-su/${TEST_IDS.admin}`, title: "Test Admin" },
  ]) {
    await page.goto(route);
    await expect(page.locator("h1")).toContainText(title);
  }

  await expect(page.locator("body")).not.toContainText("1234567890123456");
  await page.goto(`/quan-tri/ho-so/${ADMIN_UI_APPLICATION_ID}`);
  await expect(page.locator("body")).not.toContainText("012345678901");

  expect(consoleErrors).toEqual([]);
  } finally {
    await cleanupAdminUiDetails();
  }
});

test("administrator can create a staff account from the management form", async ({ page }) => {
  const email = "manager-created@test.invalid";
  await cleanupCreatedUser(email);

  try {
    await page.goto("/dang-nhap");
    await page.getByLabel("Tên đăng nhập").fill("admin");
    await page.getByLabel("Mật khẩu").fill("admin-test-password");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/quan-tri$/);

    await page.goto("/quan-tri/nhan-su/moi");
    await page.getByLabel("Họ và tên").fill("Quản lý kiểm thử");
    await page.getByLabel("Tên đăng nhập").fill("manager-created");
    await page.getByLabel("Email liên hệ").fill(email);
    await page.getByLabel("Vai trò").selectOption("MANAGER");
    await page.getByLabel("Mật khẩu ban đầu").fill("manager-password-123");
    await page.getByLabel("Xác nhận mật khẩu").fill("manager-password-123");
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();

    await expect(page).toHaveURL(/\/quan-tri\/nhan-su\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "Quản lý kiểm thử" })).toBeVisible();
    await expect(page.getByText("manager-created", { exact: true })).toBeVisible();
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    await expect(page.locator('[data-slot="badge"]').filter({ hasText: "MANAGER" })).toBeVisible();

    await page.goto("/quan-tri/nhat-ky");
    await expect(page.getByText("USER_CREATED", { exact: true })).toBeVisible();
  } finally {
    await cleanupCreatedUser(email);
  }
});

test("management routes redirect anonymous visitors to login", async ({ page }) => {
  await page.goto("/quan-tri/lien-ket");
  await expect(page).toHaveURL(/\/dang-nhap$/);
});

test("administrator login rejects invalid credentials without revealing account state", async ({
  page,
}) => {
  await page.goto("/dang-nhap");
  await page.getByLabel("Tên đăng nhập").fill("admin");
  await page.getByLabel("Mật khẩu").fill("wrong-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  await expect(page.getByText("Tên đăng nhập hoặc mật khẩu không đúng.")).toBeVisible();
  await expect(page).toHaveURL(/\/dang-nhap$/);
});

test("administrator cannot use email as the login identifier", async ({ page }) => {
  await page.goto("/dang-nhap");
  await page.getByLabel("Tên đăng nhập").fill("admin@test.invalid");
  await page.getByLabel("Mật khẩu").fill("admin-test-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  await expect(page.getByText("Tên đăng nhập hoặc mật khẩu không đúng.")).toBeVisible();
  await expect(page).toHaveURL(/\/dang-nhap$/);
});

test("administrator account locks after repeated invalid passwords", async ({ page }) => {
  await resetAdminLockout();

  try {
    await page.goto("/dang-nhap");

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await page.getByLabel("Tên đăng nhập").fill("admin");
      await page.getByLabel("Mật khẩu").fill("wrong-password");
      await page.getByRole("button", { name: "Đăng nhập" }).click();
      await expect(
        page.getByText("Tên đăng nhập hoặc mật khẩu không đúng."),
      ).toBeVisible();
    }

    await page.getByLabel("Mật khẩu").fill("admin-test-password");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/quan-tri$/);
    await page.getByRole("button", { name: "Đăng xuất" }).click();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await page.getByLabel("Tên đăng nhập").fill("admin");
      await page.getByLabel("Mật khẩu").fill("wrong-password");
      await page.getByRole("button", { name: "Đăng nhập" }).click();
      await expect(
        page.getByText("Tên đăng nhập hoặc mật khẩu không đúng."),
      ).toBeVisible();
    }

    await page.getByLabel("Mật khẩu").fill("admin-test-password");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(
      page.getByText(
        "Tài khoản đang bị khóa hoặc vô hiệu hóa. Vui lòng liên hệ quản trị viên.",
      ),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/dang-nhap$/);
  } finally {
    await resetAdminLockout();
  }
});

test("login is single-flight and ignores an external return target", async ({ page }) => {
  let loginRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/auth/login")) {
      loginRequests += 1;
    }
  });

  await page.goto("/dang-nhap?returnTo=https://attacker.invalid/collect");
  await page.getByLabel("Tên đăng nhập").fill("admin");
  await page.getByLabel("Mật khẩu").fill("admin-test-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click({ clickCount: 2 });

  await expect(page).toHaveURL(/\/quan-tri$/);
  expect(loginRequests).toBe(1);
});

test("an expired session cannot reopen an admin route", async ({ page }) => {
  await page.goto("/dang-nhap");
  await page.getByLabel("Tên đăng nhập").fill("admin");
  await page.getByLabel("Mật khẩu").fill("admin-test-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/quan-tri$/);

  await withTestClient((client) =>
    client.query("UPDATE app_sessions SET expire = $1", [new Date(0)]).then(() => undefined),
  );
  await page.goto("/quan-tri");
  await expect(page).toHaveURL(/\/dang-nhap$/);
});
