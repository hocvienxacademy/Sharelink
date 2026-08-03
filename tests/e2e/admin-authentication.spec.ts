import { expect, test } from "@playwright/test";
import { withTestClient } from "../helpers/test-database";

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
  page.on("console", (message) => {
    if (message.text().includes("expected a native <button>")) {
      nativeButtonWarnings.push(message.text());
    }
  });

  await page.goto("/dang-nhap");

  await page.getByLabel("Tài khoản").fill("admin@test.invalid");
  await page.getByLabel("Mật khẩu").fill("admin-test-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  await expect(page).toHaveURL(/\/quan-tri$/);
  expect(nativeButtonWarnings).toEqual([]);
  await expect(
    page.getByRole("heading", { name: /Chào Test Admin/ }),
  ).toBeVisible();
  await expect(page.getByText("Tổng hồ sơ", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/dang-nhap$/);
});

test("administrator login rejects invalid credentials without revealing account state", async ({
  page,
}) => {
  await page.goto("/dang-nhap");
  await page.getByLabel("Tài khoản").fill("admin@test.invalid");
  await page.getByLabel("Mật khẩu").fill("wrong-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  await expect(page.getByText("Tên đăng nhập hoặc mật khẩu không đúng.")).toBeVisible();
  await expect(page).toHaveURL(/\/dang-nhap$/);
});

test("administrator account locks after repeated invalid passwords", async ({ page }) => {
  await resetAdminLockout();

  try {
    await page.goto("/dang-nhap");

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await page.getByLabel("Tài khoản").fill("admin@test.invalid");
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
      await page.getByLabel("Tài khoản").fill("admin@test.invalid");
      await page.getByLabel("Mật khẩu").fill("wrong-password");
      await page.getByRole("button", { name: "Đăng nhập" }).click();
      await expect(
        page.getByText("Tên đăng nhập hoặc mật khẩu không đúng."),
      ).toBeVisible();
    }

    await page.getByLabel("Mật khẩu").fill("admin-test-password");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(
      page.getByText("Tên đăng nhập hoặc mật khẩu không đúng."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/dang-nhap$/);
  } finally {
    await resetAdminLockout();
  }
});
