import { defineConfig, devices } from "@playwright/test";

if (process.env.E2E_EXTERNAL_SERVER !== "1") {
  throw new Error(
    "Run E2E tests through `npm run test:e2e`; direct Playwright execution is disabled so the guarded test database cannot be bypassed.",
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL: "http://127.0.0.1:3100",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
