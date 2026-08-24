import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  applicationRepository,
  createDraftApplication,
  getEditableApplication,
  submitApplication,
  updateDraftApplication,
} from "../../../src/composition/applications";
import { catalogRepository } from "../../../src/composition/catalogs";
import { getRegistrationContext } from "../../../src/composition/registration-links";
import {
  ConflictError,
  DatabaseError,
  NotFoundError,
  ValidationError,
} from "../../../src/shared/errors";
import {
  GetCurrentAdmissionPeriod,
  ListAvailableMajors,
} from "../../../src/modules/catalogs";
import { TEST_IDS, TEST_TOKENS } from "../../fixtures/test-data";
import { restoreSeedData } from "../../helpers/integration-fixtures";
import { withTestClient } from "../../helpers/test-database";

const completeDraft = {
  fullName: "Student Test One",
  gender: "FEMALE" as const,
  dateOfBirth: "2000-01-15",
  placeOfBirth: "Test Province",
  ethnicity: "Test Ethnicity",
  religion: "None",
  nationality: "Testland",
  citizenId: "001234567890",
  citizenIdIssuedDate: "2020-01-01",
  citizenIdIssuedPlace: "Test Authority",
  permanentAddress: "123 Test Street",
  workplace: null,
  phone: "0900000001",
  email: "student-one@test.invalid",
  contactAddress: "456 Test Avenue",
  admissionDiploma: "THPT" as const,
  graduateMajor: "Test Graduate Major",
  graduationYear: 2020,
  highSchoolName: "Test High School",
  highSchoolWard: "Test Ward",
  highSchoolProvince: "Test Province",
};

beforeEach(restoreSeedData);

test("catalog services use inclusive dates, reject overlapping open periods, and sort active majors", async () => {
  const currentPeriod = new GetCurrentAdmissionPeriod(catalogRepository);
  const availableMajors = new ListAvailableMajors(catalogRepository);

  assert.equal((await currentPeriod.execute()).code, "OPEN-TEST");
  assert.deepEqual(
    (await availableMajors.execute()).map((major) => major.id),
    [TEST_IDS.majorOne, TEST_IDS.majorTwo],
  );

  await withTestClient(async (client) => {
    await client.query(
      "UPDATE admission_periods SET start_date = CURRENT_DATE, end_date = CURRENT_DATE WHERE id = $1",
      [TEST_IDS.openPeriod],
    );
  });
  assert.equal((await currentPeriod.execute()).code, "OPEN-TEST");

  await withTestClient(async (client) => {
    await client.query(
      `INSERT INTO admission_periods
         (id, code, name, start_date, end_date, is_active)
       VALUES ('20000000-0000-4000-8000-000000000099', 'OVERLAP-TEST',
               'Overlapping test period', CURRENT_DATE, CURRENT_DATE + 1, true)`,
    );
  });
  await assert.rejects(() => currentPeriod.execute(), ConflictError);
});

test("registration context resolves only usable links, supports fallback, and never returns the token", async () => {
  const context = await getRegistrationContext.execute(TEST_TOKENS.active);
  assert.equal("admissionPeriod" in context, false);
  assert.equal(context.hasApplication, false);
  assert.equal(JSON.stringify(context).includes(TEST_TOKENS.active), false);

  const fallback = await getRegistrationContext.execute(TEST_TOKENS.fallback);
  assert.equal("admissionPeriod" in fallback, false);

  for (const token of [
    TEST_TOKENS.expired,
    TEST_TOKENS.inactive,
    TEST_TOKENS.missing,
  ]) {
    await assert.rejects(
      () => getRegistrationContext.execute(token),
      NotFoundError,
    );
  }
});

test("draft creation is atomic, creates initial history, and enforces one application per link", async () => {
  const draft = await createDraftApplication.execute(TEST_TOKENS.active, {
    fullName: "Draft Test Student",
    relatives: [
      {
        position: 1,
        fullName: "Relative Test",
        relationship: "Parent",
        occupation: "Tester",
        phone: "0900000002",
        address: "Test Address",
      },
    ],
  });

  assert.equal(draft.status, "DRAFT");
  assert.equal(draft.version, 1);

  const persisted = await getEditableApplication.execute(
    TEST_TOKENS.active,
    draft.id,
  );
  assert.equal(persisted.relatives.length, 1);
  assert.equal(persisted.relatives[0]?.position, 1);

  const databaseState = await withTestClient(async (client) => {
    const history = await client.query<{
      previous_status: string | null;
      new_status: string;
    }>(
      `SELECT previous_status, new_status
       FROM application_status_histories WHERE application_id = $1`,
      [draft.id],
    );
    return history.rows;
  });
  assert.deepEqual(databaseState, [
    { previous_status: null, new_status: "DRAFT" },
  ]);

  const refreshedContext =
    await getRegistrationContext.execute(TEST_TOKENS.active);
  assert.deepEqual(refreshedContext.application, {
    id: draft.id,
    status: "DRAFT",
  });
  await assert.rejects(
    () => createDraftApplication.execute(TEST_TOKENS.active, {}),
    ConflictError,
  );
});

test("a relative CHECK failure rolls back the whole draft transaction and maps to a safe error", async () => {
  await assert.rejects(
    () =>
      applicationRepository.createDraft({
        registrationLinkId: TEST_IDS.activeLink,
        saleId: TEST_IDS.sale,
        admissionPeriodId: TEST_IDS.openPeriod,
        majorId: null,
        entryQualification: null,
        studentNameHint: null,
        values: {
          fullName: "Rollback Test",
          relatives: [
            {
              position: 1,
              fullName: "Relative",
              relationship: "Parent",
              occupation: "Tester",
              phone: "invalid-phone",
              address: "Test Address",
            },
          ],
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseError);
      assert.equal(JSON.stringify(error).includes("invalid-phone"), false);
      return true;
    },
  );

  const count = await withTestClient(async (client) => {
    const result = await client.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM applications",
    );
    return result.rows[0]?.count;
  });
  assert.equal(count, "0");
});

test("updates enforce version and link scope and implement relatives omit/replace/empty semantics", async () => {
  const draft = await createDraftApplication.execute(TEST_TOKENS.active, {
    fullName: "Original Test",
    relatives: [
      {
        position: 1,
        fullName: "First Relative",
        relationship: "Parent",
        occupation: "Tester",
        phone: "0900000002",
        address: "First Address",
      },
    ],
  });

  const withoutRelatives = await updateDraftApplication.execute(
    TEST_TOKENS.active,
    draft.id,
    { expectedVersion: 1, fullName: "Updated Test" },
  );
  assert.equal(withoutRelatives.version, 2);
  assert.equal(withoutRelatives.relatives.length, 1);

  await assert.rejects(
    () =>
      updateDraftApplication.execute(TEST_TOKENS.active, draft.id, {
        expectedVersion: 1,
        fullName: "Stale",
      }),
    ConflictError,
  );

  const replaced = await updateDraftApplication.execute(
    TEST_TOKENS.active,
    draft.id,
    {
      expectedVersion: 2,
      relatives: [
        {
          position: 1,
          fullName: "Replacement One",
          relationship: "Sibling",
          occupation: "Tester",
          phone: "0900000003",
          address: "Replacement Address",
        },
        {
          position: 2,
          fullName: "Replacement Two",
          relationship: "Parent",
          occupation: "Tester",
          phone: "0900000004",
          address: "Replacement Address",
        },
      ],
    },
  );
  assert.equal(replaced.version, 3);
  assert.deepEqual(
    replaced.relatives.map((relative) => relative.position),
    [1, 2],
  );

  const emptied = await updateDraftApplication.execute(
    TEST_TOKENS.active,
    draft.id,
    { expectedVersion: 3, relatives: [] },
  );
  assert.equal(emptied.version, 4);
  assert.deepEqual(emptied.relatives, []);

  const otherDraft = await createDraftApplication.execute(
    TEST_TOKENS.fallback,
    {
      fullName: "Other Scope",
      relatives: [
        {
          position: 1,
          fullName: "Other Scope Relative",
          relationship: "Parent",
          occupation: "Tester",
          phone: "0900000005",
          address: "Other Scope Address",
        },
      ],
    },
  );
  await assert.rejects(
    () =>
      updateDraftApplication.execute(TEST_TOKENS.active, otherDraft.id, {
        expectedVersion: 1,
      }),
    NotFoundError,
  );
  const persistedOtherDraft = await getEditableApplication.execute(
    TEST_TOKENS.fallback,
    otherDraft.id,
  );
  assert.equal(persistedOtherDraft.version, 1);
  assert.equal(
    persistedOtherDraft.relatives[0]?.fullName,
    "Other Scope Relative",
  );
});

test("relative replacement failure rolls back both application fields and version", async () => {
  const draft = await createDraftApplication.execute(TEST_TOKENS.active, {
    fullName: "Before Rollback",
    relatives: [
      {
        position: 1,
        fullName: "Stable Relative",
        relationship: "Parent",
        occupation: "Tester",
        phone: "0900000002",
        address: "Stable Address",
      },
    ],
  });

  await assert.rejects(
    () =>
      applicationRepository.updateDraft({
        applicationId: draft.id,
        registrationLinkId: TEST_IDS.activeLink,
        expectedVersion: 1,
        majorId: undefined,
        entryQualification: undefined,
        values: {
          expectedVersion: 1,
          fullName: "Must Roll Back",
          relatives: [
            {
              position: 1,
              fullName: "Invalid Relative",
              relationship: "Parent",
              occupation: "Tester",
              phone: "bad",
              address: "Invalid Address",
            },
          ],
        },
      }),
    DatabaseError,
  );

  const persisted = await getEditableApplication.execute(
    TEST_TOKENS.active,
    draft.id,
  );
  assert.equal(persisted.version, 1);
  assert.equal(persisted.fullName, "Before Rollback");
  assert.equal(persisted.relatives[0]?.fullName, "Stable Relative");
});

test("submission is atomic, optional fields remain optional, and link/payment state is untouched", async () => {
  const draft = await createDraftApplication.execute(
    TEST_TOKENS.active,
    completeDraft,
  );
  const submitted = await submitApplication.execute(
    TEST_TOKENS.active,
    draft.id,
    { expectedVersion: 1 },
  );

  assert.equal(submitted.status, "SUBMITTED");
  assert.equal(submitted.version, 2);
  assert.ok(submitted.submittedAt);

  const state = await withTestClient(async (client) => {
    const application = await client.query<{
      status: string;
      version: number;
    }>("SELECT status, version FROM applications WHERE id = $1", [draft.id]);
    const histories = await client.query<{ new_status: string }>(
      `SELECT new_status FROM application_status_histories
       WHERE application_id = $1 ORDER BY created_at`,
      [draft.id],
    );
    const link = await client.query<{
      status: string;
      access_count: number;
    }>(
      "SELECT status, access_count FROM registration_links WHERE id = $1",
      [TEST_IDS.activeLink],
    );
    const payments = await client.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM payment_confirmations",
    );
    return {
      application: application.rows[0],
      histories: histories.rows,
      link: link.rows[0],
      payments: payments.rows[0]?.count,
    };
  });

  assert.deepEqual(state.application, { status: "SUBMITTED", version: 2 });
  assert.deepEqual(state.histories, [
    { new_status: "DRAFT" },
    { new_status: "SUBMITTED" },
  ]);
  assert.deepEqual(state.link, { status: "ACTIVE", access_count: 0 });
  assert.equal(state.payments, "0");

  await assert.rejects(
    () =>
      submitApplication.execute(TEST_TOKENS.active, draft.id, {
        expectedVersion: 2,
      }),
    ConflictError,
  );
});

test("incomplete application and incomplete existing relative cannot submit or mutate state", async () => {
  const incomplete = await createDraftApplication.execute(
    TEST_TOKENS.active,
    {
      fullName: "Incomplete",
      relatives: [{ position: 1, fullName: "Partial Relative" }],
    },
  );

  await assert.rejects(
    () =>
      submitApplication.execute(TEST_TOKENS.active, incomplete.id, {
        expectedVersion: 1,
      }),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.ok(error.details.length > 1);
      return true;
    },
  );

  const state = await withTestClient(async (client) => {
    const result = await client.query<{
      status: string;
      version: number;
      submitted_at: Date | null;
    }>(
      "SELECT status, version, submitted_at FROM applications WHERE id = $1",
      [incomplete.id],
    );
    return result.rows[0];
  });
  assert.deepEqual(state, {
    status: "DRAFT",
    version: 1,
    submitted_at: null,
  });
});
