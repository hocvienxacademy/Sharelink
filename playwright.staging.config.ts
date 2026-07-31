import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.STAGING_BASE_URL;
if (!baseURL || new URL(baseURL).protocol !== "https:") {
  throw new Error("STAGING_BASE_URL must be an HTTPS staging origin.");
}
if (!process.env.STAGING_SMOKE_TOKEN) {
  throw new Error("STAGING_SMOKE_TOKEN is required.");
}

export default defineConfig({
  testDir: "./tests/staging",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "staging-report" }]],
  outputDir: "staging-test-results",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "staging-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
