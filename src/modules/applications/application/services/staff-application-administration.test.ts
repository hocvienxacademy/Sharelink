import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuthenticatedActor } from "@/shared/authorization";
import { ConflictError, ForbiddenError, ValidationError } from "@/shared/errors";
import type { CatalogRepository } from "@/modules/catalogs";
import type { Application } from "../../domain/application";
import type { AdminApplicationQueryRepository } from "../ports/admin-application-query-repository";
import type { StaffApplicationRepository, StaffContentUpdateInput, StaffReviewInput } from "../ports/staff-application-repository";
import type { SubmissionPolicy } from "../ports/application-repository";
import { StaffApplicationAdministration } from "./staff-application-administration";

const manager: AuthenticatedActor = { userId: "manager-1", username: "manager", role: "MANAGER" };
const sale: AuthenticatedActor = { userId: "sale-1", username: "sale", role: "SALE" };

function application(overrides: Partial<Application> = {}): Application {
  return {
    id: "22222222-2222-4222-8222-222222222222", registrationLinkId: "link-1", status: "SUBMITTED",
    majorId: null, admissionPeriodId: "period-1", entryQualification: null, fullName: "Student", gender: null,
    dateOfBirth: null, placeOfBirth: null, ethnicity: null, religion: null, nationality: null, citizenId: null,
    citizenIdIssuedDate: null, citizenIdIssuedPlace: null, permanentAddress: null, workplace: null, phone: null,
    email: null, contactAddress: null, admissionDiploma: null, graduateMajor: null, graduationYear: null,
    highSchoolName: null, highSchoolWard: null, highSchoolProvince: null, declarationPlace: null,
    declarationDate: null, declarationConfirmed: false, dataProcessingConsent: false, submittedAt: new Date(),
    version: 3, relatives: [], ...overrides,
  };
}

class FakeQueries implements AdminApplicationQueryRepository {
  constructor(readonly ownerManagerId: string | null = manager.userId, readonly status: Application["status"] = "SUBMITTED") {}
  async findAuthorizationResource() { return { ownerId: sale.userId, ownerManagerId: this.ownerManagerId, status: this.status }; }
  async findDetail() { return null; }
  async list() { return []; }
}

class FakeRepository implements StaffApplicationRepository {
  contentUpdates: StaffContentUpdateInput[] = [];
  reviews: StaffReviewInput[] = [];
  constructor(public current: Application = application()) {}
  async findById() { return this.current; }
  async updateContent(input: StaffContentUpdateInput) {
    this.contentUpdates.push(input);
    this.current = { ...this.current, fullName: input.values.fullName ?? this.current.fullName, version: this.current.version + 1 };
    return this.current;
  }
  async review(input: StaffReviewInput) {
    this.reviews.push(input);
    this.current = { ...this.current, status: input.newStatus, version: this.current.version + 1, latestRevisionReason: input.reason };
    return this.current;
  }
}

const catalogs: CatalogRepository = {
  findAdmissionPeriodById: async () => null,
  findActiveMajorById: async () => null,
  listActiveAdmissionPeriods: async () => [],
  listActiveMajors: async () => [],
};
const complete: SubmissionPolicy = { validate: () => [] };

describe("StaffApplicationAdministration", () => {
  it("keeps SALE mutations forbidden before persistence", async () => {
    const repository = new FakeRepository();
    const service = new StaffApplicationAdministration(new FakeQueries(), repository, catalogs, complete);
    await assert.rejects(() => service.updateContent(sale, repository.current.id, { expectedVersion: 3, fullName: "Blocked" }, "request-1"), ForbiddenError);
    assert.equal(repository.contentUpdates.length, 0);
  });

  it("enforces direct-report scope and confirmed edit states", async () => {
    const repository = new FakeRepository();
    const outside = new StaffApplicationAdministration(new FakeQueries("other-manager"), repository, catalogs, complete);
    await assert.rejects(() => outside.updateContent(manager, repository.current.id, { expectedVersion: 3, fullName: "Blocked" }, "request-2"), ForbiddenError);
    const terminal = new StaffApplicationAdministration(new FakeQueries(manager.userId, "VALID"), repository, catalogs, complete);
    await assert.rejects(() => terminal.updateContent(manager, repository.current.id, { expectedVersion: 3, fullName: "Blocked" }, "request-3"), ConflictError);
    assert.equal(repository.contentUpdates.length, 0);
  });

  it("updates allowlisted content with version, scope, and changed field names", async () => {
    const repository = new FakeRepository();
    const service = new StaffApplicationAdministration(new FakeQueries(), repository, catalogs, complete);
    const result = await service.updateContent(manager, repository.current.id, { expectedVersion: 3, fullName: "Updated" }, "request-4");
    assert.equal(result.fullName, "Updated");
    assert.deepEqual(repository.contentUpdates[0]?.changedFields, ["fullName"]);
    assert.deepEqual(repository.contentUpdates[0]?.scope, { kind: "manager", managerId: manager.userId });
  });

  it("trims revision reason and validates completeness before VALID", async () => {
    const repository = new FakeRepository();
    const service = new StaffApplicationAdministration(new FakeQueries(), repository, catalogs, complete);
    await service.requestRevision(manager, repository.current.id, { expectedVersion: 3, expectedStatus: "SUBMITTED", reason: "  Add diploma  " }, "request-5");
    assert.equal(repository.reviews[0]?.reason, "Add diploma");

    const incompleteRepository = new FakeRepository();
    const incomplete: SubmissionPolicy = { validate: () => [{ path: ["fullName"], code: "required", message: "Required" }] };
    const validationService = new StaffApplicationAdministration(new FakeQueries(), incompleteRepository, catalogs, incomplete);
    await assert.rejects(() => validationService.validate(manager, incompleteRepository.current.id, { expectedVersion: 3, expectedStatus: "SUBMITTED" }, "request-6"), ValidationError);
    assert.equal(incompleteRepository.reviews.length, 0);
  });
});
