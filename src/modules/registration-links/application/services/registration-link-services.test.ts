import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NotFoundError } from "../../../../shared/errors/index";
import type { Clock } from "../../../../shared/time/index";
import type {
  AdmissionPeriod,
  CatalogRepository,
  Major,
} from "../../../catalogs/index";
import type {
  RegistrationLink,
  RegistrationLinkRepository,
} from "../../domain/registration-link";
import { GetRegistrationContext } from "./get-registration-context";
import { ValidateRegistrationLink } from "./validate-registration-link";

const token = "11111111-1111-4111-8111-111111111111";
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
  id: "major-1",
  code: "IT",
  name: "Information Technology",
  displayOrder: 1,
  isActive: true,
};

function link(overrides: Partial<RegistrationLink> = {}): RegistrationLink {
  return {
    id: "link-1",
    saleId: "sale-1",
    admissionPeriodId: admissionPeriod.id,
    majorId: null,
    studentNameHint: "Student",
    entryQualification: null,
    status: "ACTIVE",
    expiresAt: new Date("2026-08-01T08:00:00.000Z"),
    applicationId: null,
    applicationStatus: null,
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
  async findAdmissionPeriodById(id: string) {
    return id === admissionPeriod.id ? admissionPeriod : null;
  }

  async findActiveMajorById(id: string) {
    return id === major.id ? major : null;
  }

  async listActiveAdmissionPeriods() {
    return [admissionPeriod];
  }

  async listActiveMajors() {
    return [major];
  }
}

function validator(value: RegistrationLink | null) {
  return new ValidateRegistrationLink(
    new FakeLinkRepository(value),
    clock,
  );
}

describe("ValidateRegistrationLink", () => {
  it("rejects an unknown token", async () => {
    await assert.rejects(validator(null).execute(token), NotFoundError);
  });

  it("rejects an expired token", async () => {
    await assert.rejects(
      validator(
        link({ expiresAt: new Date("2026-07-31T08:00:00.000Z") }),
      ).execute(token),
      NotFoundError,
    );
  });

  it("rejects a non-active token", async () => {
    await assert.rejects(
      validator(link({ status: "CANCELLED" })).execute(token),
      NotFoundError,
    );
  });

  it("returns an internal validated context for a valid token", async () => {
    const result = await validator(link()).execute(token);

    assert.equal(result.link.id, "link-1");
  });

  it("accepts an active link without an admission period", async () => {
    const result = await validator(link({ admissionPeriodId: null })).execute(token);

    assert.equal(result.link.admissionPeriodId, null);
  });
});

describe("GetRegistrationContext", () => {
  it("never exposes payment data in the public registration context", async () => {
    const result = await new GetRegistrationContext(
      validator(link({ applicationId: "22222222-2222-4222-8222-222222222222", applicationStatus: "SUBMITTED" })),
      new FakeCatalogRepository(),
    ).execute(token);

    assert.equal("payment" in result, false);
    assert.equal(JSON.stringify(result).includes("accountNumber"), false);
  });

  it("does not return the token or internal link identifier", async () => {
    const service = new GetRegistrationContext(
      validator(link()),
      new FakeCatalogRepository(),
    );

    const result = await service.execute(token);
    const serialized = JSON.stringify(result);

    assert.equal(serialized.includes(token), false);
    assert.equal(serialized.includes("link-1"), false);
    assert.deepEqual(result.majors, [
      {
        id: "major-1",
        code: "IT",
        name: "Information Technology",
      },
    ]);
    assert.equal(result.application, null);
  });

  it("returns the minimum current application reference needed to reopen a draft", async () => {
    const applicationId = "22222222-2222-4222-8222-222222222222";
    const service = new GetRegistrationContext(
      validator(link({ applicationId, applicationStatus: "DRAFT" })),
      new FakeCatalogRepository(),
    );

    const result = await service.execute(token);

    assert.deepEqual(result.application, {
      id: applicationId,
      status: "DRAFT",
    });
  });
});
