import { expect, type Page } from "@playwright/test";

export async function selectOption(
  page: Page,
  label: RegExp,
  option: string,
): Promise<void> {
  await page.getByLabel(label).click();
  await page.getByRole("option", { name: option }).click();
}

export async function fillRequiredPersonalInformation(
  page: Page,
  name = "Student Browser Test",
): Promise<void> {
  await page.getByLabel(/^Họ và tên/).fill(name);
  await page.getByLabel(/^Ngày sinh/).fill("2000-01-15");
  await selectOption(page, /^Giới tính/, "Nữ");
  await page.getByLabel(/^Quốc tịch/).fill("Testland");
  await page.getByLabel(/^Nơi sinh/).fill("Test Province");
  await page.getByLabel(/^Dân tộc/).fill("Test Ethnicity");
  await page.getByLabel(/^Tôn giáo/).fill("None");
  await page.getByLabel(/^Số điện thoại/).fill("0900000001");
  await page.getByLabel(/^Email/).fill("browser@test.invalid");
  await page.getByLabel(/^CCCD/).fill("001234567890");
  await page.getByLabel(/^Ngày cấp/).fill("2020-01-01");
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
  await page.getByLabel(/^Xã\/phường/).fill("Test Ward");
  await page.getByLabel(/^Tỉnh\/thành phố/).fill("Test Province");
}

export async function expectNoBrowserStorage(page: Page): Promise<void> {
  const storage = await page.evaluate(() => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
  }));
  expect(storage).toEqual({ local: [], session: [] });
}
