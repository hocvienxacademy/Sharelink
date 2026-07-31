import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  createDraftApplication,
  getEditableApplication,
  submitApplication,
  updateDraftApplication,
} from "../../../src/composition/applications";
import { TEST_TOKENS } from "../../fixtures/test-data";
import { restoreSeedData } from "../../helpers/integration-fixtures";
import { withTestClient } from "../../helpers/test-database";

const completeDraft = {
  fullName: "Concurrency Student",
  gender: "MALE" as const,
  dateOfBirth: "2000-01-15",
  placeOfBirth: "Test Province",
  ethnicity: "Test Ethnicity",
  religion: "None",
  nationality: "Testland",
  citizenId: "001234567890",
  citizenIdIssuedDate: "2020-01-01",
  citizenIdIssuedPlace: "Test Authority",
  permanentAddress: "123 Test Street",
  phone: "0900000001",
  email: "concurrency@test.invalid",
  contactAddress: "456 Test Avenue",
  admissionDiploma: "THPT" as const,
  graduateMajor: "Test Major",
  graduationYear: 2020,
  highSchoolName: "Test High School",
  highSchoolWard: "Test Ward",
  highSchoolProvince: "Test Province",
};

beforeEach(restoreSeedData);

test("two real concurrent updates with one expectedVersion produce one complete winner", async () => {
  const draft = await createDraftApplication.execute(
    TEST_TOKENS.active,
    completeDraft,
  );
  const updates = [
    {
      expectedVersion: 1,
      fullName: "Winner Candidate A",
      relatives: [
        {
          position: 1,
          fullName: "Relative A",
          relationship: "Parent",
          occupation: "Tester",
          phone: "0900000011",
          address: "Address A",
        },
      ],
    },
    {
      expectedVersion: 1,
      fullName: "Winner Candidate B",
      relatives: [
        {
          position: 1,
          fullName: "Relative B",
          relationship: "Sibling",
          occupation: "Tester",
          phone: "0900000012",
          address: "Address B",
        },
      ],
    },
  ] as const;

  const outcomes = await Promise.allSettled(
    updates.map((values) =>
      updateDraftApplication.execute(TEST_TOKENS.active, draft.id, values),
    ),
  );
  assert.equal(
    outcomes.filter((outcome) => outcome.status === "fulfilled").length,
    1,
  );
  assert.equal(
    outcomes.filter((outcome) => outcome.status === "rejected").length,
    1,
  );

  const persisted = await getEditableApplication.execute(
    TEST_TOKENS.active,
    draft.id,
  );
  assert.equal(persisted.version, 2);
  const winningSuffix = persisted.fullName?.endsWith("A") ? "A" : "B";
  assert.equal(persisted.relatives.length, 1);
  assert.equal(persisted.relatives[0]?.fullName, `Relative ${winningSuffix}`);
  assert.equal(persisted.relatives[0]?.address, `Address ${winningSuffix}`);
});

test("two real concurrent submissions create one transition and one history row", async () => {
  const draft = await createDraftApplication.execute(
    TEST_TOKENS.active,
    completeDraft,
  );
  const outcomes = await Promise.allSettled([
    submitApplication.execute(TEST_TOKENS.active, draft.id, {
      expectedVersion: 1,
    }),
    submitApplication.execute(TEST_TOKENS.active, draft.id, {
      expectedVersion: 1,
    }),
  ]);

  assert.equal(
    outcomes.filter((outcome) => outcome.status === "fulfilled").length,
    1,
  );
  assert.equal(
    outcomes.filter((outcome) => outcome.status === "rejected").length,
    1,
  );

  const state = await withTestClient(async (client) => {
    const application = await client.query<{
      status: string;
      version: number;
    }>("SELECT status, version FROM applications WHERE id = $1", [draft.id]);
    const history = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM application_status_histories
       WHERE application_id = $1 AND new_status = 'SUBMITTED'`,
      [draft.id],
    );
    return {
      application: application.rows[0],
      submittedHistories: history.rows[0]?.count,
    };
  });

  assert.deepEqual(state.application, { status: "SUBMITTED", version: 2 });
  assert.equal(state.submittedHistories, "1");
});
