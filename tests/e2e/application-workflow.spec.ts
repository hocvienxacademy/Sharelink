import { expect, test } from "@playwright/test";
import { TEST_TOKENS } from "../fixtures/test-data";
import { restoreSeedData } from "../helpers/integration-fixtures";
import { withTestClient } from "../helpers/test-database";
import {
  expectNoBrowserStorage,
  fillRequiredEducation,
  fillRequiredPersonalInformation,
} from "./form-helpers";

test.beforeEach(async () => restoreSeedData());

test("create, redirect, refresh, update, and clear relatives persist through PostgreSQL", async ({
  page,
}) => {
  await page.goto(`/dang-ky/${TEST_TOKENS.active}`);
  await fillRequiredPersonalInformation(page);
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(page).toHaveURL(/\/ho-so\/[0-9a-f-]{36}$/);
  const applicationId = page.url().split("/").at(-1)!;

  await page.reload();
  await expect(page.getByLabel(/^Họ và tên/)).toHaveValue(
    "Student Browser Test",
  );
  await expectNoBrowserStorage(page);

  await page.getByRole("button", { name: /Bước 3:/ }).click();
  await expect(page.locator("legend").filter({ hasText: "Người thân" })).toBeVisible();
  await page.getByRole("button", { name: "Thêm người thân" }).click();
  const relative = page.getByText("Người thân 1").locator("..").locator("..");
  await relative.getByLabel(/^Họ và tên/).fill("Relative Browser Test");
  await relative.getByLabel(/^Quan hệ/).fill("Parent");
  await relative.getByLabel(/^Nghề nghiệp/).fill("Tester");
  await relative.getByLabel(/^Điện thoại/).fill("0900000002");
  await relative.getByLabel(/^Địa chỉ/).fill("Relative Test Address");
  const relativeUpdate = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" && response.status() === 200,
  );
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  const savedRelativeResponse = await relativeUpdate;
  expect(savedRelativeResponse.request().postDataJSON().relatives[0].position).toBe(
    1,
  );
  await expect(page.locator('div[role="status"]')).toContainText("Đã lưu");

  await page.reload();
  await page.getByRole("button", { name: /Bước 3:/ }).click();
  await expect(page.getByLabel(/^Họ và tên/)).toHaveValue(
    "Relative Browser Test",
  );
  await page.getByRole("button", { name: "Xóa người thân 1" }).click();
  const removalUpdate = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" && response.status() === 200,
  );
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  const removedRelativeResponse = await removalUpdate;
  expect(removedRelativeResponse.request().postDataJSON().relatives).toEqual(
    [],
  );

  const relatives = await withTestClient(async (client) => {
    const result = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM application_relatives WHERE application_id = $1`,
      [applicationId],
    );
    return result.rows[0]?.count;
  });
  expect(relatives).toBe("0");
  await page.reload();
  await page.getByRole("button", { name: /Bước 3:/ }).click();
  await expect(page.getByText("Người thân 1")).toHaveCount(0);
});

test("validation focuses the first issue, review preserves data, and submit becomes read-only", async ({
  page,
}) => {
  await page.goto(`/dang-ky/${TEST_TOKENS.active}`);
  await page.getByLabel(/^Họ và tên/).fill("Incomplete Browser Draft");
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(page).toHaveURL(/\/ho-so\//);
  await page.getByRole("button", { name: /Bước 4:/ }).click();
  await page.getByRole("button", { name: "Nộp hồ sơ" }).click();
  await expect(page.locator('[data-slot="alert"]')).toBeVisible();
  await expect(page.getByLabel(/^Ngày sinh/)).toBeFocused();
  await expect(page.getByLabel(/^Ngày sinh/)).toHaveAttribute(
    "aria-invalid",
    "true",
  );

  await fillRequiredPersonalInformation(page);
  await fillRequiredEducation(page);
  await page.getByRole("button", { name: /Bước 4:/ }).click();
  await expect(page.getByText("Student Browser Test")).toBeVisible();
  await page.getByRole("button", { name: "Quay lại" }).click();
  await page.getByRole("button", { name: "Quay lại" }).click();
  await expect(page.getByLabel(/^Tên trường THPT/)).toHaveValue(
    "Test High School",
  );
  await page.getByRole("button", { name: /Bước 4:/ }).click();
  await page.getByRole("button", { name: "Nộp hồ sơ" }).click();
  await expect(page.locator('[data-slot="alert"]')).toContainText(
    "Hồ sơ đã được nộp thành công",
  );
  const submittedUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(submittedUrl);
  await expect(page.locator('[data-slot="alert"]')).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);

  const state = await withTestClient(async (client) => {
    const result = await client.query<{
      application_status: string;
      link_status: string;
      payments: string;
    }>(
      `SELECT
         applications.status::text AS application_status,
         registration_links.status::text AS link_status,
         (SELECT count(*)::text FROM payment_confirmations) AS payments
       FROM applications
       JOIN registration_links ON registration_links.id = applications.registration_link_id`,
    );
    return result.rows[0];
  });
  expect(state).toEqual({
    application_status: "SUBMITTED",
    link_status: "ACTIVE",
    payments: "0",
  });
});

test("two browser tabs expose a version conflict without overwrite or automatic retry", async ({
  browser,
  page,
}) => {
  await page.goto(`/dang-ky/${TEST_TOKENS.active}`);
  await page.getByLabel(/^Họ và tên/).fill("Initial Version");
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(page).toHaveURL(/\/ho-so\//);
  const url = page.url();

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await secondPage.goto(url);
  await expect(secondPage.getByLabel(/^Họ và tên/)).toHaveValue(
    "Initial Version",
  );

  await page.getByLabel(/^Họ và tên/).fill("Saved by tab A");
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(page.locator('div[role="status"]')).toContainText("Đã lưu");

  let patchRequests = 0;
  secondPage.on("request", (request) => {
    if (request.method() === "PATCH") patchRequests += 1;
  });
  await secondPage.getByLabel(/^Họ và tên/).fill("Stale tab B");
  await secondPage.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(secondPage.locator('[data-slot="alert"]')).toContainText(
    "Dữ liệu đã thay đổi",
  );
  expect(patchRequests).toBe(1);
  await secondPage.getByRole("button", { name: "Tải lại hồ sơ" }).click();
  await expect(secondPage.getByLabel(/^Họ và tên/)).toHaveValue(
    "Saved by tab A",
  );
  await secondContext.close();
});
