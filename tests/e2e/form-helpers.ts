import { expect, type Page } from "@playwright/test";

export async function selectOption(
  page: Page,
  label: RegExp,
  option: string,
): Promise<void> {
  await page.getByLabel(label).click();
  await page.getByRole("option", { name: option }).click();
}

async function selectDate(
  page: Page,
  label: RegExp,
  value: { readonly day: number; readonly month: number; readonly year: number },
): Promise<void> {
  await page.getByLabel(label).click();
  const calendar = page.locator('[data-slot="calendar"]');
  const dropdowns = calendar.getByRole("combobox");
  await dropdowns.nth(0).selectOption(String(value.month - 1));
  await dropdowns.nth(1).selectOption(String(value.year));
  await calendar
    .locator(`[data-day="${value.day}/${value.month}/${value.year}"]`)
    .click();
}

export async function fillRequiredPersonalInformation(
  page: Page,
  name = "Student Browser Test",
): Promise<void> {
  await page.getByLabel(/^Họ và tên/).fill(name);
  await selectDate(page, /^Ngày sinh/, { day: 15, month: 1, year: 2000 });
  await selectOption(page, /^Giới tính/, "Nữ");
  await page.getByLabel(/^Quốc tịch/).fill("Testland");
  await selectOption(page, /^Nơi sinh/, "Hà Nội");
  await page.getByLabel(/^Dân tộc/).fill("Test Ethnicity");
  await page.getByLabel(/^Tôn giáo/).fill("None");
  await page.getByLabel(/^Số điện thoại/).fill("0900000001");
  await page.getByLabel(/^Email/).fill("browser@test.invalid");
  await page.getByLabel(/^CCCD/).fill("001234567890");
  await selectDate(page, /^Ngày cấp/, { day: 1, month: 1, year: 2020 });
  await page.getByLabel(/^Nơi cấp/).fill("Test Authority");
  await page.getByLabel(/^Địa chỉ thường trú/).fill("123 Test Street");
  await page.getByLabel(/^Địa chỉ liên hệ/).fill("456 Test Avenue");
}

export async function fillRequiredEducation(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Bước 2:/ }).click();
  await selectOption(page, /^Bằng dùng/, "Trung học phổ thông");
  await page.getByLabel(/^Ngành tốt nghiệp/).fill("Test Graduate Major");
  await page.getByLabel(/^Năm tốt nghiệp/).fill("2020");
  await page.getByLabel(/^Tên trường THPT/).fill("Test High School");
  await selectOption(page, /^Tỉnh\/thành phố/, "Hà Nội");
  await page.getByLabel(/^Xã\/phường/).fill("Test Ward");
}

export async function expectNoBrowserStorage(page: Page): Promise<void> {
  const storage = await page.evaluate(() => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
  }));
  expect(storage).toEqual({ local: [], session: [] });
}
