import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { TEST_TOKENS } from "../fixtures/test-data";
import { restoreSeedData } from "../helpers/integration-fixtures";
import { withTestClient } from "../helpers/test-database";
import { expectNoBrowserStorage } from "./form-helpers";

test.beforeEach(async () => restoreSeedData());

test("valid public link has private metadata, no third-party requests, and opening it creates no draft", async ({
  page,
}) => {
  const externalOrigins = new Set<string>();
  const consoleMessages: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["http://127.0.0.1:3100", "data:", "blob:"].includes(url.origin)) {
      externalOrigins.add(url.origin);
    }
  });
  page.on("console", (message) => consoleMessages.push(message.text()));

  const response = await page.goto(`/dang-ky/${TEST_TOKENS.active}`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(await page.title()).not.toContain(TEST_TOKENS.active);
  expect(
    await page.locator('link[rel="canonical"]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("href")),
    ),
  ).not.toContainEqual(expect.stringContaining(TEST_TOKENS.active));
  expect(externalOrigins).toEqual(new Set());
  expect(consoleMessages.join("\n")).not.toContain(TEST_TOKENS.active);
  await expectNoBrowserStorage(page);

  const scriptUrls = await page.locator('script[src^="/_next/"]').evaluateAll(
    (scripts) =>
      scripts
        .map((script) => script.getAttribute("src"))
        .filter((value): value is string => value !== null),
  );
  expect(scriptUrls.some((url) => url.endsWith(".map"))).toBe(false);
  for (const scriptUrl of scriptUrls) {
    const script = await page.request.get(scriptUrl);
    const scriptBody = await script.text();
    expect(scriptBody).not.toContain("DATABASE_URL");
    expect(scriptBody).not.toMatch(/sourceMappingURL\s*=/);
    expect((await page.request.get(`${scriptUrl}.map`)).status()).toBe(404);
  }

  const applicationCount = await withTestClient(async (client) => {
    const result = await client.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM applications",
    );
    return result.rows[0]?.count;
  });
  expect(applicationCount).toBe("0");
});

test("invalid, missing, expired, and inactive links fail safely", async ({
  page,
}) => {
  await page.goto("/dang-ky/not-a-uuid");
  await expect(page.locator('[data-slot="alert"]')).toBeVisible();

  for (const token of [
    TEST_TOKENS.missing,
    TEST_TOKENS.expired,
    TEST_TOKENS.inactive,
  ]) {
    await page.goto(`/dang-ky/${token}`);
    await expect(page.locator('[data-slot="alert"]')).toBeVisible();
    await expect(page.locator("body")).not.toContainText(token);
  }
});

test("API responses are no-store and strict server-owned fields are rejected safely", async ({
  page,
}) => {
  const context = await page.request.get(
    `/api/registration-links/${TEST_TOKENS.active}/context`,
  );
  expect(context.status()).toBe(200);
  expect(context.headers()["cache-control"]).toContain("no-store");
  expect(await context.text()).not.toContain(TEST_TOKENS.active);

  const response = await page.request.post(
    `/api/registration-links/${TEST_TOKENS.active}/applications`,
    {
      data: {
        fullName: "Mass Assignment Test",
        status: "SUBMITTED",
        saleId: "10000000-0000-4000-8000-000000000099",
        createdAt: "2026-01-01T00:00:00.000Z",
        submittedAt: "2026-01-01T00:00:00.000Z",
        registrationLinkId: "40000000-0000-4000-8000-000000000099",
        paymentStatus: "CONFIRMED",
      },
    },
  );
  expect(response.status()).toBe(422);
  const body = await response.text();
  expect(body).not.toContain(TEST_TOKENS.active);
  expect(body).not.toMatch(/Prisma|PostgreSQL|constraint|DATABASE_URL/i);
});

test("automated accessibility scan has no serious or critical violations", async ({
  page,
}) => {
  await page.goto(`/dang-ky/${TEST_TOKENS.active}`);
  await expect(page.locator("form")).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const severe = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );
  expect(severe).toEqual([]);
});
