import { defineConfig, devices } from "@playwright/test";

function parseUrl(value: string | undefined): URL | undefined {
  if (value === undefined) return undefined;
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

const baseURL = process.env.STAGING_BASE_URL;
const stagingUrl = parseUrl(baseURL);
const stagingHostname = stagingUrl?.hostname.toLowerCase() ?? "";
if (
  !stagingUrl ||
  stagingUrl.protocol !== "https:" ||
  !stagingHostname.includes("staging") ||
  stagingHostname.includes("prod") ||
  stagingHostname.includes("production") ||
  stagingUrl.username !== "" ||
  stagingUrl.password !== "" ||
  stagingUrl.pathname !== "/" ||
  stagingUrl.search !== "" ||
  stagingUrl.hash !== ""
) {
  throw new Error(
    "STAGING_BASE_URL must be an HTTPS staging origin without credentials, path, query, or fragment.",
  );
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
  reporter: "list",
  outputDir: "staging-test-results",
  use: {
    baseURL,
    screenshot: "off",
    trace: "off",
    video: "off",
  },
  projects: [
    {
      name: "staging-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
