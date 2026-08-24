import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Application } from "../../domain/application";
import { DefaultSubmissionPolicy } from "./default-submission-policy";

function completeApplication(
  overrides: Partial<Application> = {},
): Application {
  return {
    id: "application-1",
    registrationLinkId: "link-1",
    status: "DRAFT",
    majorId: "major-1",
    admissionPeriodId: "period-1",
    entryQualification: "THPT",
    fullName: "Nguyễn Văn A",
    gender: "MALE",
    dateOfBirth: "2005-01-02",
    placeOfBirth: "Hà Nội",
    ethnicity: "Kinh",
    religion: "Không",
    nationality: "Việt Nam",
    citizenId: "001234567890",
    citizenIdIssuedDate: "2021-01-02",
    citizenIdIssuedPlace: "Cục Cảnh sát quản lý hành chính về trật tự xã hội",
    permanentAddress: "Hà Nội",
    workplace: null,
    phone: "0901234567",
    email: "student@example.com",
    contactAddress: "Hà Nội",
    admissionDiploma: "THPT",
    graduateMajor: "Trung học phổ thông",
    graduationYear: 2023,
    highSchoolName: "THPT A",
    highSchoolWard: "Phường A",
    highSchoolProvince: "Hà Nội",
    declarationPlace: null,
    declarationDate: null,
    declarationConfirmed: false,
    dataProcessingConsent: false,
    submittedAt: null,
    version: 1,
    relatives: [],
    ...overrides,
  };
}

function issuePaths(application: Application, policy = new DefaultSubmissionPolicy()) {
  return policy.validate(application).map((issue) => issue.path.join("."));
}

describe("DefaultSubmissionPolicy personal information", () => {
  it("allows a complete application with the required admission selections", () => {
    assert.deepEqual(
      new DefaultSubmissionPolicy().validate(completeApplication()),
      [],
    );
  });

  it("requires full name", () => {
    assert.ok(
      issuePaths(completeApplication({ fullName: "  " })).includes("fullName"),
    );
  });

  it("requires date of birth", () => {
    assert.ok(
      issuePaths(completeApplication({ dateOfBirth: null })).includes(
        "dateOfBirth",
      ),
    );
  });

  it("requires phone", () => {
    assert.ok(
      issuePaths(completeApplication({ phone: null })).includes("phone"),
    );
  });

  it("requires citizen identification", () => {
    assert.ok(
      issuePaths(completeApplication({ citizenId: null })).includes(
        "citizenId",
      ),
    );
  });

  it("requires both permanent and contact addresses", () => {
    const paths = issuePaths(
      completeApplication({
        permanentAddress: null,
        contactAddress: "",
      }),
    );

    assert.ok(paths.includes("permanentAddress"));
    assert.ok(paths.includes("contactAddress"));
  });

  it("allows workplace to be omitted", () => {
    assert.deepEqual(
      new DefaultSubmissionPolicy().validate(
        completeApplication({ workplace: null }),
      ),
      [],
    );
  });

  it("requires every other field displayed in the personal section", () => {
    const paths = issuePaths(
      completeApplication({
        placeOfBirth: null,
        ethnicity: " ",
        religion: null,
        nationality: null,
        citizenIdIssuedDate: null,
        citizenIdIssuedPlace: "",
        email: null,
        admissionDiploma: null,
        graduateMajor: null,
        graduationYear: null,
        highSchoolName: null,
        highSchoolWard: null,
        highSchoolProvince: null,
      }),
    );

    assert.deepEqual(paths, [
      "placeOfBirth",
      "ethnicity",
      "religion",
      "nationality",
      "citizenIdIssuedDate",
      "citizenIdIssuedPlace",
      "email",
      "admissionDiploma",
      "graduateMajor",
      "graduationYear",
      "highSchoolName",
      "highSchoolWard",
      "highSchoolProvince",
    ]);
  });

  it("collects every displayable issue without sensitive values", () => {
    const issues = new DefaultSubmissionPolicy().validate(
      completeApplication({
        fullName: null,
        dateOfBirth: null,
        gender: null,
        nationality: null,
        phone: null,
        citizenId: null,
        permanentAddress: null,
        contactAddress: null,
        placeOfBirth: null,
        ethnicity: null,
        religion: null,
        citizenIdIssuedDate: null,
        citizenIdIssuedPlace: null,
        email: null,
        admissionDiploma: null,
        graduateMajor: null,
        graduationYear: null,
        highSchoolName: null,
        highSchoolWard: null,
        highSchoolProvince: null,
      }),
    );
    const serialized = JSON.stringify(issues);

    assert.ok(issues.length > 0);
    assert.equal(serialized.includes("001234567890"), false);
    assert.equal(serialized.includes("public_token"), false);
    assert.equal(serialized.includes("Prisma"), false);
  });
});

describe("DefaultSubmissionPolicy admission selections and relatives", () => {
  it("requires a registered major", () => {
    assert.ok(
      issuePaths(completeApplication({ majorId: null })).includes("majorId"),
    );
  });

  it("requires an entry qualification", () => {
    assert.ok(
      issuePaths(
        completeApplication({ entryQualification: null }),
      ).includes("entryQualification"),
    );
  });

  it("allows the relatives section to be omitted by default", () => {
    assert.deepEqual(
      new DefaultSubmissionPolicy().validate(
        completeApplication({ relatives: [] }),
      ),
      [],
    );
  });

  it("requires all fields when a relative is provided", () => {
    const paths = issuePaths(
      completeApplication({
        relatives: [
          {
            id: "relative-1",
            position: 1,
            fullName: "Nguyễn Văn B",
            relationship: null,
            occupation: null,
            phone: null,
            address: null,
          },
        ],
      }),
    );

    assert.deepEqual(paths, [
      "relatives.0.relationship",
      "relatives.0.occupation",
      "relatives.0.phone",
      "relatives.0.address",
    ]);
  });

  it("enforces the configured minimum relative count", () => {
    const policy = new DefaultSubmissionPolicy({
      minimumRelatives: 1,
    });

    assert.equal(
      policy
        .validate(completeApplication())
        .some((issue) => issue.code === "minimum_relatives"),
      true,
    );
  });

  it("enforces required relative positions", () => {
    const policy = new DefaultSubmissionPolicy({
      minimumRelatives: 1,
      requiredRelativePositions: [1],
    });
    const issues = policy.validate(
      completeApplication({
        relatives: [
          {
            id: "relative-2",
            position: 2,
            fullName: "Nguyễn Văn B",
            relationship: null,
            occupation: null,
            phone: null,
            address: null,
          },
        ],
      }),
    );

    assert.equal(
      issues.some((issue) => issue.code === "required_relative_position"),
      true,
    );
  });

  it("rejects duplicate relative positions in an aggregate", () => {
    const relative = {
      id: "relative-1",
      position: 1,
      fullName: "Nguyễn Văn B",
      relationship: null,
      occupation: null,
      phone: null,
      address: null,
    };
    const issues = new DefaultSubmissionPolicy().validate(
      completeApplication({
        relatives: [relative, { ...relative, id: "relative-2" }],
      }),
    );

    assert.equal(
      issues.some((issue) => issue.code === "duplicate_relative_position"),
      true,
    );
  });

  it("rejects an entirely empty relative", () => {
    const issues = new DefaultSubmissionPolicy().validate(
      completeApplication({
        relatives: [
          {
            id: "relative-1",
            position: 1,
            fullName: null,
            relationship: null,
            occupation: null,
            phone: null,
            address: null,
          },
        ],
      }),
    );

    assert.equal(
      issues.some((issue) => issue.code === "empty_relative"),
      true,
    );
  });

  it("enforces configured required relative fields", () => {
    const policy = new DefaultSubmissionPolicy({
      requiredRelativeFields: ["fullName", "phone"],
    });
    const issues = policy.validate(
      completeApplication({
        relatives: [
          {
            id: "relative-1",
            position: 1,
            fullName: null,
            relationship: "Cha",
            occupation: null,
            phone: null,
            address: null,
          },
        ],
      }),
    );

    assert.deepEqual(
      issues
        .filter((issue) => issue.code === "required")
        .map((issue) => issue.path.join(".")),
      ["relatives.0.fullName", "relatives.0.phone"],
    );
  });

  it("rejects configuration outside the database position constraint", () => {
    assert.throws(
      () =>
        new DefaultSubmissionPolicy({
          maximumRelatives: 3,
        }),
      /maximum <= 2/,
    );
    assert.throws(
      () =>
        new DefaultSubmissionPolicy({
          minimumRelatives: 1,
          requiredRelativePositions: [3],
        }),
      /between 1 and 2/,
    );
  });

  it("is synchronous and has no repository dependency", () => {
    const result = new DefaultSubmissionPolicy().validate(
      completeApplication(),
    );

    assert.equal(Array.isArray(result), true);
    assert.equal(result instanceof Promise, false);
  });
});
