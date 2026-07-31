import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.STAGING_BASE_URL;
if (!baseURL || new URL(baseURL).protocol !== "https:") {
  throw new Error("STAGING_BASE_URL must be an HTTPS staging origin.");
}
if (!process.env.STAGING_SMOKE_TOKEN) {
  throw new Error("STAGING_SMOKE_TOKEN is required.");
}
if (!process.env.STAGING_RATE_LIMIT_TOKEN) {
  throw new Error("STAGING_RATE_LIMIT_TOKEN is required.");
}
if (process.env.STAGING_SMOKE_ALLOW_MUTATION !== "yes") {
  throw new Error("STAGING_SMOKE_ALLOW_MUTATION=yes is required.");
}
if (!process.env.STAGING_BACKUP_ID) {
  throw new Error("STAGING_BACKUP_ID is required before mutating smoke tests.");
}
if (!/^[a-zA-Z0-9_-]{6,40}$/.test(process.env.STAGING_SMOKE_RUN_ID ?? "")) {
  throw new Error("STAGING_SMOKE_RUN_ID must be a safe unique fixture marker.");
}
if (process.env.STAGING_EXPECT_HSTS !== "true") {
  throw new Error("STAGING_EXPECT_HSTS=true is required after HTTPS validation.");
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
