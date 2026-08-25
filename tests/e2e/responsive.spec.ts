import { expect, test, type Page } from "@playwright/test";
import { TEST_TOKENS } from "../fixtures/test-data";
import { restoreSeedData } from "../helpers/integration-fixtures";

const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
] as const;

const mobileViewports = viewports.filter(({ width }) => width <= 768);
const adminRoutes = [
  "/quan-tri",
  "/quan-tri/lien-ket",
  "/quan-tri/ho-so",
  "/quan-tri/thanh-toan",
  "/quan-tri/nhan-su",
  "/quan-tri/nganh-hoc",
  "/quan-tri/ky-tuyen-sinh",
  "/quan-tri/tai-khoan-ngan-hang",
  "/quan-tri/cai-dat",
  "/quan-tri/nhat-ky",
] as const;

async function loginAsAdmin(page: Page) {
  await page.goto("/dang-nhap");
  await page.getByLabel("Tên đăng nhập").fill("admin");
  await page.getByLabel("Mật khẩu").fill("admin-test-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/quan-tri$/);
}

test.beforeEach(async () => restoreSeedData());

for (const viewport of viewports) {
  test(`registration form has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto(`/dang-ky/${TEST_TOKENS.active}`);
    await expect(page.locator("form")).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(
      dimensions.viewportWidth,
    );
    await page.screenshot({
      path: testInfo.outputPath(
        `registration-form-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: true,
    });
  });
}

for (const viewport of mobileViewports) {
  test("all admin functions have no horizontal overflow at " + viewport.width + "x" + viewport.height, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await loginAsAdmin(page);

    for (const route of adminRoutes) {
      await page.goto(route);
      await expect(
        page.getByRole("button", { name: "Mở điều hướng quản trị" }),
      ).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(
        dimensions.documentWidth,
        route + " overflowed at " + viewport.width + "px",
      ).toBeLessThanOrEqual(dimensions.viewportWidth);
      const overflowingTables = await page
        .locator('[data-slot="table-container"]')
        .evaluateAll((containers) =>
          containers.filter(
            (container) => container.scrollWidth > container.clientWidth,
          ).length,
        );
      expect(
        overflowingTables,
        route + " contained a horizontally scrolling table at " + viewport.width + "px",
      ).toBe(0);
    }

    await page.screenshot({
      path: testInfo.outputPath(
        "admin-mobile-" + viewport.width + "x" + viewport.height + ".png",
      ),
      fullPage: true,
    });
  });
}
