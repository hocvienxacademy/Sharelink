import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ForbiddenError } from "@/shared/errors";
import type { AuthenticatedActor } from "@/shared/authorization";
import type {
  AdminRegistrationLinkRepository,
  CreateRegistrationLinkCommand,
  TransitionRegistrationLinkCommand,
  UpdateRegistrationLinkCommand,
} from "../ports/admin-registration-link-repository";
import type { RegistrationLinkAuthorizationResource } from "../authorization/registration-link-authorization";
import { RegistrationLinkAdministrationService } from "./registration-link-administration";

const sale: AuthenticatedActor = {
  userId: "10000000-0000-4000-8000-000000000001",
  username: "sale.one",
  role: "SALE",
};
const otherSaleId = "20000000-0000-4000-8000-000000000002";
const manager: AuthenticatedActor = {
  userId: "30000000-0000-4000-8000-000000000003",
  username: "manager.one",
  role: "MANAGER",
};
const context = { requestId: "request-1" };
const fields = {
  majorId: null,
  studentNameHint: null,
  entryQualification: null,
  paymentRound: null,
  internalNote: null,
  expiresAt: null,
};

class FakeRepository implements AdminRegistrationLinkRepository {
  resource: RegistrationLinkAuthorizationResource | null = {
    ownerId: sale.userId,
    ownerManagerId: manager.userId,
    status: "DRAFT",
  };
  createCommand: CreateRegistrationLinkCommand | null = null;
  updateCommand: UpdateRegistrationLinkCommand | null = null;
  transitionCommand: TransitionRegistrationLinkCommand | null = null;

  async findAuthorizationResource(): Promise<RegistrationLinkAuthorizationResource | null> {
    return this.resource;
  }
  async create(command: CreateRegistrationLinkCommand) {
    this.createCommand = command;
    return { id: "40000000-0000-4000-8000-000000000004", status: "DRAFT" as const, updatedAt: new Date() };
  }
  async updateDetails(command: UpdateRegistrationLinkCommand) {
    this.updateCommand = command;
    return { id: command.id, status: "DRAFT" as const, updatedAt: new Date() };
  }
  async transition(command: TransitionRegistrationLinkCommand) {
    this.transitionCommand = command;
    return { id: command.id, status: "ACTIVE" as const, updatedAt: new Date() };
  }
}

describe("RegistrationLinkAdministrationService", () => {
  it("forces SALE-created links to be owned by the authenticated SALE", async () => {
    const repository = new FakeRepository();
    await new RegistrationLinkAdministrationService(repository).create(sale, fields, context);
    assert.equal(repository.createCommand?.fields.saleId, sale.userId);
  });

  it("rejects a SALE attempting to assign a new link to another SALE", async () => {
    const repository = new FakeRepository();
    await assert.rejects(
      () => new RegistrationLinkAdministrationService(repository).create(sale, { ...fields, saleId: otherSaleId }, context),
      ForbiddenError,
    );
    assert.equal(repository.createCommand, null);
  });

  it("allows a SALE to update their own DRAFT link with an expected version", async () => {
    const repository = new FakeRepository();
    const expectedUpdatedAt = "2026-08-03T00:00:00.000Z";
    await new RegistrationLinkAdministrationService(repository).updateDetails(
      sale,
      "40000000-0000-4000-8000-000000000004",
      { ...fields, expectedStatus: "DRAFT", expectedUpdatedAt },
      context,
    );
    assert.equal(repository.updateCommand?.expectedUpdatedAt.toISOString(), expectedUpdatedAt);
  });

  it("denies another SALE and a MANAGER from mutating the link", async () => {
    const repository = new FakeRepository();
    const service = new RegistrationLinkAdministrationService(repository);
    const input = {
      expectedStatus: "DRAFT",
      expectedUpdatedAt: "2026-08-03T00:00:00.000Z",
      reason: null,
    };
    await assert.rejects(
      () => service.transition({ ...sale, userId: otherSaleId }, "40000000-0000-4000-8000-000000000004", "activate", input, context),
      ForbiddenError,
    );
    await assert.rejects(
      () => service.transition(manager, "40000000-0000-4000-8000-000000000004", "activate", input, context),
      ForbiddenError,
    );
    assert.equal(repository.transitionCommand, null);
  });
});
