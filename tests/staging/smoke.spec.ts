import { expect, test } from "@playwright/test";

const token = process.env.STAGING_SMOKE_TOKEN!;
const invalidToken =
  process.env.STAGING_SMOKE_INVALID_TOKEN ??
  "00000000-0000-4000-8000-000000000000";
const runId = process.env.STAGING_SMOKE_RUN_ID!;

const completeDraft = {
  fullName: `STAGING SMOKE FIXTURE ${runId}`,
  gender: "MALE",
  dateOfBirth: "2000-01-15",
  placeOfBirth: "Tỉnh thử nghiệm",
  ethnicity: "Kinh",
  religion: "Không",
  nationality: "Việt Nam",
  citizenId: "001234567890",
  citizenIdIssuedDate: "2020-01-01",
  citizenIdIssuedPlace: "Cơ quan thử nghiệm",
  permanentAddress: "Địa chỉ staging giả",
  phone: "0900000099",
  email: "staging-smoke@test.invalid",
  contactAddress: "Địa chỉ liên hệ staging giả",
  admissionDiploma: "THPT",
  graduateMajor: "Ngành thử nghiệm",
  graduationYear: 2020,
  highSchoolName: "Trường staging giả",
  highSchoolWard: "Phường thử nghiệm",
  highSchoolProvince: "Tỉnh thử nghiệm",
};

test("staging registration acceptance flow", async ({ page, request, baseURL }) => {
  const browserErrors: string[] = [];
  const unexpectedOrigins = new Set<string>();
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("request", (outgoing) => {
    if (new URL(outgoing.url()).origin !== new URL(baseURL!).origin) {
      unexpectedOrigins.add(new URL(outgoing.url()).origin);
    }
  });

  const home = await page.goto("/");
  expect(home?.status()).toBeLessThan(500);

  const contextUrl = `/api/registration-links/${encodeURIComponent(token)}/context`;
  const context = await request.get(contextUrl);
  expect(context.status()).toBe(200);
  expect(context.headers()["cache-control"]).toContain("no-store");
  expect(context.headers()["referrer-policy"]).toBe("no-referrer");
  expect(context.headers()["x-content-type-options"]).toBe("nosniff");
  expect(context.headers()["content-security-policy"]).toBeTruthy();
  expect(context.headers()["permissions-policy"]).toBeTruthy();
  expect(context.headers()["strict-transport-security"]).toContain("max-age=");

  const invalid = await request.get(
    `/api/registration-links/${invalidToken}/context`,
  );
  expect([400, 404]).toContain(invalid.status());
  expect(await invalid.text()).not.toContain(token);

  const contextBody = await context.json();
  expect(contextBody.data.application).toBeNull();

  const oversizedMarker = `STAGING_OVERSIZED_${runId}`;
  const oversized = await request.post(
    `/api/registration-links/${encodeURIComponent(token)}/applications`,
    { data: { fullName: oversizedMarker.repeat(4_096) } },
  );
  expect(oversized.status()).toBe(413);
  expect(await oversized.text()).not.toContain(oversizedMarker);

  const created = await request.post(
    `/api/registration-links/${encodeURIComponent(token)}/applications`,
    { data: completeDraft },
  );
  expect(created.status()).toBe(201);
  const createdBody = await created.json();
  const applicationId = createdBody.data.id as string;
  const initialVersion = createdBody.data.version as number;

  const reopened = await request.get(
    `/api/registration-links/${encodeURIComponent(token)}/applications/${applicationId}`,
  );
  expect(reopened.status()).toBe(200);
  const reopenedBody = await reopened.json();
  expect(reopenedBody.data.placeOfBirth).toBe(completeDraft.placeOfBirth);
  expect(reopenedBody.data.nationality).toBe(completeDraft.nationality);
  expect(reopenedBody.data.contactAddress).toBe(completeDraft.contactAddress);
  expect(reopenedBody.data.highSchoolName).toBe(completeDraft.highSchoolName);

  const updated = await request.patch(
    `/api/registration-links/${encodeURIComponent(token)}/applications/${applicationId}`,
    { data: { expectedVersion: initialVersion, workplace: "STAGING SMOKE" } },
  );
  expect(updated.status()).toBe(200);
  const updatedBody = await updated.json();

  const stale = await request.patch(
    `/api/registration-links/${encodeURIComponent(token)}/applications/${applicationId}`,
    { data: { expectedVersion: initialVersion, workplace: "STALE" } },
  );
  expect(stale.status()).toBe(409);

  const submitted = await request.post(
    `/api/registration-links/${encodeURIComponent(token)}/applications/${applicationId}/submit`,
    { data: { expectedVersion: updatedBody.data.version } },
  );
  expect(submitted.status()).toBe(200);

  const readOnlyPage = await page.goto(
    `/dang-ky/${encodeURIComponent(token)}/ho-so/${applicationId}`,
  );
  expect(readOnlyPage?.status()).toBe(200);
  await expect(
    page.getByText("Hồ sơ không còn ở trạng thái bản nháp"),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Hồ sơ đã được nộp hoặc đang được xử lý. Giao diện chỉnh sửa đã được khóa.",
    ),
  ).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
  expect(browserErrors).toEqual([]);
  expect(unexpectedOrigins).toEqual(new Set());
});

test("dedicated staging token reaches the distributed rate limit", async ({
  request,
}) => {
  const rateToken = process.env.STAGING_RATE_LIMIT_TOKEN;
  const attempts = Number(process.env.STAGING_RATE_LIMIT_MAX_ATTEMPTS ?? 80);
  let limitedResponse: Awaited<ReturnType<typeof request.get>> | undefined;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await request.get(
      `/api/registration-links/${encodeURIComponent(rateToken!)}/context`,
    );
    if (response.status() === 429) {
      limitedResponse = response;
      break;
    }
  }

  expect(limitedResponse?.status()).toBe(429);
  expect(Number(limitedResponse?.headers()["retry-after"])).toBeGreaterThan(0);
  expect(await limitedResponse!.text()).not.toContain(rateToken!);
});
