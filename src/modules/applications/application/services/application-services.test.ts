import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../../shared/errors/index";
import type { Clock } from "../../../../shared/time/index";
import type {
  AdmissionPeriod,
  CatalogRepository,
  Major,
} from "../../../catalogs/index";
import {
  ValidateRegistrationLink,
  type RegistrationLink,
  type RegistrationLinkRepository,
} from "../../../registration-links/index";
import type { Application } from "../../domain/application";
import type {
  ApplicationRepository,
  CreateDraftPersistenceInput,
  SubmissionPolicy,
  SubmitApplicationPersistenceInput,
  UpdateDraftPersistenceInput,
} from "../ports/application-repository";
import { CreateDraftApplication } from "./create-draft-application";
import { GetEditableApplication } from "./get-editable-application";
import { SubmitApplication } from "./submit-application";
import { UpdateDraftApplication } from "./update-draft-application";
import { ExportCredentialFactory } from "@/modules/word-export/application/export-credential";

const token = "11111111-1111-4111-8111-111111111111";
const applicationId = "22222222-2222-4222-8222-222222222222";
const clock: Clock = {
  now: () => new Date("2026-07-31T08:00:00.000Z"),
  today: () => "2026-07-31",
};
const admissionPeriod: AdmissionPeriod = {
  id: "period-1",
  code: "2026",
  name: "Admission 2026",
  startDate: "2026-07-01",
  endDate: "2026-08-31",
  isActive: true,
};
const major: Major = {
  id: "33333333-3333-4333-8333-333333333333",
  code: "IT",
  name: "Information Technology",
  displayOrder: 1,
  isActive: true,
};

function registrationLink(
  overrides: Partial<RegistrationLink> = {},
): RegistrationLink {
  return {
    id: "link-1",
    saleId: "sale-1",
    admissionPeriodId: admissionPeriod.id,
    majorId: null,
    studentNameHint: null,
    entryQualification: null,
    status: "ACTIVE",
    expiresAt: new Date("2026-08-31T08:00:00.000Z"),
    applicationId: null,
    applicationStatus: null,
    ...overrides,
  };
}

function application(overrides: Partial<Application> = {}): Application {
  return {
    id: applicationId,
    registrationLinkId: "link-1",
    status: "DRAFT",
    majorId: null,
    admissionPeriodId: admissionPeriod.id,
    entryQualification: null,
    fullName: null,
    gender: null,
    dateOfBirth: null,
    placeOfBirth: null,
    ethnicity: null,
    religion: null,
    nationality: "Việt Nam",
    citizenId: null,
    citizenIdIssuedDate: null,
    citizenIdIssuedPlace: null,
    permanentAddress: null,
    workplace: null,
    phone: null,
    email: null,
    contactAddress: null,
    admissionDiploma: null,
    graduateMajor: null,
    graduationYear: null,
    highSchoolName: null,
    highSchoolWard: null,
    highSchoolProvince: null,
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

class FakeLinkRepository implements RegistrationLinkRepository {
  constructor(readonly value: RegistrationLink | null) {}

  async findByPublicToken(input: string) {
    return input === token ? this.value : null;
  }
}

class FakeCatalogRepository implements CatalogRepository {
  constructor(readonly period: AdmissionPeriod = admissionPeriod) {}

  async findAdmissionPeriodById(id: string) {
    return id === this.period.id ? this.period : null;
  }

  async findActiveMajorById(id: string) {
    return id === major.id ? major : null;
  }

  async listActiveAdmissionPeriods() {
    return [this.period];
  }

  async listActiveMajors() {
    return [major];
  }
}

class FakeApplicationRepository implements ApplicationRepository {
  current: Application | null;
  failNextUpdate = false;
  submitCalls = 0;
  lastSubmitInput: SubmitApplicationPersistenceInput | null = null;

  constructor(initial: Application | null = null) {
    this.current = initial;
  }

  async createDraft(input: CreateDraftPersistenceInput) {
    if (this.current !== null) {
      throw new ConflictError();
    }

    this.current = application({
      registrationLinkId: input.registrationLinkId,
      majorId: input.majorId,
      admissionPeriodId: input.admissionPeriodId,
      entryQualification: input.entryQualification,
      fullName: input.values.fullName ?? input.studentNameHint,
      relatives: (input.values.relatives ?? []).map((relative, index) => ({
        id: `relative-${index + 1}`,
        position: relative.position,
        fullName: relative.fullName ?? null,
        relationship: relative.relationship ?? null,
        occupation: relative.occupation ?? null,
        phone: relative.phone ?? null,
        address: relative.address ?? null,
      })),
    });

    return this.current;
  }

  async findByRegistrationContext(
    registrationLinkId: string,
    requestedApplicationId: string,
  ) {
    return this.current?.registrationLinkId === registrationLinkId &&
      this.current.id === requestedApplicationId
      ? this.current
      : null;
  }

  async findByRegistrationLinkId(registrationLinkId: string) {
    return this.current?.registrationLinkId === registrationLinkId
      ? this.current
      : null;
  }

  async updateDraft(input: UpdateDraftPersistenceInput) {
    if (
      this.current === null ||
      this.current.version !== input.expectedVersion ||
      this.current.status !== "DRAFT"
    ) {
      throw new ConflictError();
    }

    if (this.failNextUpdate) {
      throw new Error("Simulated relative write failure.");
    }

    this.current = {
      ...this.current,
      fullName: input.values.fullName ?? this.current.fullName,
      majorId:
        input.majorId === undefined ? this.current.majorId : input.majorId,
      entryQualification:
        input.entryQualification === undefined
          ? this.current.entryQualification
          : input.entryQualification,
      relatives:
        input.values.relatives === undefined
          ? this.current.relatives
          : input.values.relatives.map((relative, index) => ({
              id: `relative-${index + 1}`,
              position: relative.position,
              fullName: relative.fullName ?? null,
              relationship: relative.relationship ?? null,
              occupation: relative.occupation ?? null,
              phone: relative.phone ?? null,
              address: relative.address ?? null,
            })),
      version: this.current.version + 1,
    };

    return this.current;
  }

  async submit(input: SubmitApplicationPersistenceInput) {
    if (
      this.current === null ||
      this.current.version !== input.expectedVersion ||
      this.current.status !== "DRAFT"
    ) {
      throw new ConflictError();
    }

    this.submitCalls += 1;
    this.lastSubmitInput = input;
    this.current = {
      ...this.current,
      status: "SUBMITTED",
      submittedAt: input.submittedAt,
      version: this.current.version + 1,
    };

    return this.current;
  }
}

const completePolicy: SubmissionPolicy = {
  validate: () => [],
};
const incompletePolicy: SubmissionPolicy = {
  validate: () => [
    {
      path: ["fullName"],
      code: "required",
      message: "Full name is required.",
    },
  ],
};

function submittableApplication(
  overrides: Partial<Application> = {},
): Application {
  return application({
    majorId: major.id,
    fullName: "Nguyễn Văn A",
    dateOfBirth: "2005-01-02",
    gender: "MALE",
    placeOfBirth: "Hà Nội",
    ethnicity: "Kinh",
    religion: "Không",
    nationality: "Việt Nam",
    phone: "0901234567",
    email: "student@example.com",
    citizenId: "001234567890",
    citizenIdIssuedDate: "2021-01-02",
    citizenIdIssuedPlace: "Cục Cảnh sát quản lý hành chính về trật tự xã hội",
    permanentAddress: "Hà Nội",
    contactAddress: "Hà Nội",
    entryQualification: "THPT",
    admissionDiploma: "THPT",
    graduateMajor: "Trung học phổ thông",
    graduationYear: 2023,
    highSchoolName: "THPT A",
    highSchoolWard: "Phường A",
    highSchoolProvince: "Hà Nội",
    ...overrides,
  });
}

function dependencies(
  link: RegistrationLink | null = registrationLink(),
) {
  const catalogs = new FakeCatalogRepository();
  const validateLink = new ValidateRegistrationLink(
    new FakeLinkRepository(link),
    clock,
  );

  return { catalogs, validateLink };
}

describe("CreateDraftApplication", () => {
  it("creates a draft with server-owned relationship values", async () => {
    const { catalogs, validateLink } = dependencies();
    const repository = new FakeApplicationRepository();
    const service = new CreateDraftApplication(
      validateLink,
      catalogs,
      repository,
    );

    const result = await service.execute(token, {
      fullName: "  Nguyễn Văn A  ",
      majorId: major.id,
    });

    assert.equal(result.status, "DRAFT");
    assert.equal(repository.current?.fullName, "Nguyễn Văn A");
    assert.equal(repository.current?.registrationLinkId, "link-1");
  });

  it("creates a draft without requiring an admission period", async () => {
    const { catalogs, validateLink } = dependencies(
      registrationLink({ admissionPeriodId: null }),
    );
    const repository = new FakeApplicationRepository();
    const service = new CreateDraftApplication(
      validateLink,
      catalogs,
      repository,
    );

    await service.execute(token, {});

    assert.equal(repository.current?.admissionPeriodId, null);
  });

  it("rejects creation with an invalid registration link", async () => {
    const { catalogs, validateLink } = dependencies(null);
    const service = new CreateDraftApplication(
      validateLink,
      catalogs,
      new FakeApplicationRepository(),
    );

    await assert.rejects(service.execute(token, {}), NotFoundError);
  });

  it("rejects attempts to mass-assign server fields", async () => {
    const { catalogs, validateLink } = dependencies();
    const service = new CreateDraftApplication(
      validateLink,
      catalogs,
      new FakeApplicationRepository(),
    );

    await assert.rejects(
      service.execute(token, { status: "SUBMITTED", saleId: "attacker" }),
      ValidationError,
    );
  });

  it("reports the one-application-per-link conflict", async () => {
    const { catalogs, validateLink } = dependencies(
      registrationLink({ applicationId }),
    );
    const service = new CreateDraftApplication(
      validateLink,
      catalogs,
      new FakeApplicationRepository(application()),
    );

    await assert.rejects(service.execute(token, {}), ConflictError);
  });
});

describe("GetEditableApplication", () => {
  it("rejects an unknown application", async () => {
    const { validateLink } = dependencies();
    const service = new GetEditableApplication(
      validateLink,
      new FakeApplicationRepository(),
    );

    await assert.rejects(
      service.execute(token, applicationId),
      NotFoundError,
    );
  });

  it("does not return an application outside the registration context", async () => {
    const { validateLink } = dependencies();
    const service = new GetEditableApplication(
      validateLink,
      new FakeApplicationRepository(
        application({ registrationLinkId: "other-link" }),
      ),
    );

    await assert.rejects(
      service.execute(token, applicationId),
      NotFoundError,
    );
  });
});

describe("UpdateDraftApplication", () => {
  it("updates a draft and replaces relatives by scoped positions", async () => {
    const { catalogs, validateLink } = dependencies();
    const repository = new FakeApplicationRepository(application());
    const service = new UpdateDraftApplication(
      validateLink,
      catalogs,
      repository,
    );

    const result = await service.execute(token, applicationId, {
      expectedVersion: 1,
      fullName: "Student",
      relatives: [
        {
          position: 1,
          phone: "0123456789",
        },
      ],
    });

    assert.equal(result.version, 2);
    assert.equal(result.relatives.length, 1);
  });

  it("rejects an update after submission", async () => {
    const { catalogs, validateLink } = dependencies();
    const service = new UpdateDraftApplication(
      validateLink,
      catalogs,
      new FakeApplicationRepository(application({ status: "SUBMITTED" })),
    );

    await assert.rejects(
      service.execute(token, applicationId, { expectedVersion: 1 }),
      ConflictError,
    );
  });

  it("rejects relative identifiers and foreign keys from the client", async () => {
    const { catalogs, validateLink } = dependencies();
    const service = new UpdateDraftApplication(
      validateLink,
      catalogs,
      new FakeApplicationRepository(application()),
    );

    await assert.rejects(
      service.execute(token, applicationId, {
        expectedVersion: 1,
        relatives: [
          {
            id: "relative-from-another-application",
            applicationId: "other-application",
            position: 1,
          },
        ],
      }),
      ValidationError,
    );
  });

  it("rejects a stale optimistic-concurrency version", async () => {
    const { catalogs, validateLink } = dependencies();
    const service = new UpdateDraftApplication(
      validateLink,
      catalogs,
      new FakeApplicationRepository(application({ version: 2 })),
    );

    await assert.rejects(
      service.execute(token, applicationId, { expectedVersion: 1 }),
      ConflictError,
    );
  });

  it("preserves the aggregate when a relative write fails", async () => {
    const { catalogs, validateLink } = dependencies();
    const repository = new FakeApplicationRepository(application());
    repository.failNextUpdate = true;
    const before = repository.current;
    const service = new UpdateDraftApplication(
      validateLink,
      catalogs,
      repository,
    );

    await assert.rejects(
      service.execute(token, applicationId, {
        expectedVersion: 1,
        relatives: [{ position: 1 }],
      }),
    );
    assert.deepEqual(repository.current, before);
  });
});

describe("SubmitApplication", () => {
  const credentialFactory = new ExportCredentialFactory(() =>
    Buffer.from("0123456789abcdef0123456789abcdef", "hex"),
  );
  it("uses the default policy and calls the repository for a complete draft", async () => {
    const { catalogs, validateLink } = dependencies();
    const repository = new FakeApplicationRepository(
      submittableApplication(),
    );
    const service = new SubmitApplication(
      validateLink,
      catalogs,
      repository,
      undefined,
      clock,
    );

    await service.execute(token, applicationId, { expectedVersion: 1 });

    assert.equal(repository.submitCalls, 1);
  });

  it("rejects an incomplete application using the injected policy", async () => {
    const { validateLink } = dependencies();
    const service = new SubmitApplication(
      validateLink,
      new FakeCatalogRepository(),
      new FakeApplicationRepository(application()),
      incompletePolicy,
      clock,
    );

    await assert.rejects(
      service.execute(token, applicationId, { expectedVersion: 1 }),
      ValidationError,
    );
  });

  it("submits a complete draft once", async () => {
    const { validateLink } = dependencies();
    const repository = new FakeApplicationRepository(application());
    const service = new SubmitApplication(
      validateLink,
      new FakeCatalogRepository(),
      repository,
      completePolicy,
      clock,
      credentialFactory,
    );

    const result = await service.execute(token, applicationId, {
      expectedVersion: 1,
    });

    assert.equal(result.status, "SUBMITTED");
    assert.equal(result.version, 2);
    assert.equal(result.submittedAt, "2026-07-31T08:00:00.000Z");
    assert.equal(result.downloadCode, "ASNFZ4mrze8BI0VniavN7w");
    assert.match(repository.lastSubmitInput?.exportCredentialDigest ?? "", /^[a-f0-9]{64}$/);
  });

  it("returns a conflict for a second submission", async () => {
    const { validateLink } = dependencies();
    const service = new SubmitApplication(
      validateLink,
      new FakeCatalogRepository(),
      new FakeApplicationRepository(
        application({
          status: "SUBMITTED",
          submittedAt: clock.now(),
          version: 2,
        }),
      ),
      completePolicy,
      clock,
    );

    await assert.rejects(
      service.execute(token, applicationId, { expectedVersion: 2 }),
      ConflictError,
    );
  });

  it("rejects a non-draft before evaluating submission completeness", async () => {
    const { catalogs, validateLink } = dependencies();
    let policyCalls = 0;
    const policy: SubmissionPolicy = {
      validate: () => {
        policyCalls += 1;
        return [];
      },
    };
    const repository = new FakeApplicationRepository(
      submittableApplication({
        status: "SUBMITTED",
        submittedAt: clock.now(),
      }),
    );
    const service = new SubmitApplication(
      validateLink,
      catalogs,
      repository,
      policy,
      clock,
    );

    await assert.rejects(
      service.execute(token, applicationId, { expectedVersion: 1 }),
      ConflictError,
    );
    assert.equal(policyCalls, 0);
    assert.equal(repository.submitCalls, 0);
  });

  it("submits without requiring an open admission period", async () => {
    const { catalogs, validateLink } = dependencies(
      registrationLink({ admissionPeriodId: null }),
    );
    const repository = new FakeApplicationRepository(
      submittableApplication(),
    );
    const service = new SubmitApplication(
      validateLink,
      catalogs,
      repository,
      completePolicy,
      clock,
    );

    await service.execute(token, applicationId, { expectedVersion: 1 });

    assert.equal(repository.submitCalls, 1);
  });

  it("keeps optimistic-concurrency conflict behavior", async () => {
    const { catalogs, validateLink } = dependencies();
    const repository = new FakeApplicationRepository(
      submittableApplication({ version: 2 }),
    );
    const service = new SubmitApplication(
      validateLink,
      catalogs,
      repository,
      completePolicy,
      clock,
    );

    await assert.rejects(
      service.execute(token, applicationId, { expectedVersion: 1 }),
      ConflictError,
    );
    assert.equal(repository.submitCalls, 0);
  });

  it("does not include token, citizen ID, or database details in policy errors", async () => {
    const { catalogs, validateLink } = dependencies();
    const service = new SubmitApplication(
      validateLink,
      catalogs,
      new FakeApplicationRepository(
        submittableApplication({ fullName: null }),
      ),
      undefined,
      clock,
    );

    await assert.rejects(
      service.execute(token, applicationId, { expectedVersion: 1 }),
      (error: unknown) => {
        assert.ok(error instanceof ValidationError);
        const serialized = JSON.stringify(error.details);
        assert.equal(serialized.includes(token), false);
        assert.equal(serialized.includes("001234567890"), false);
        assert.equal(serialized.includes("Prisma"), false);
        return true;
      },
    );
  });
});
