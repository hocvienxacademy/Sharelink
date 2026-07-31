import { expect, test } from "@playwright/test";
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
