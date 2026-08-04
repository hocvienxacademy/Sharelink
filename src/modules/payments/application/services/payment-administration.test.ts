import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuthenticatedActor } from "@/shared/authorization";
import { ForbiddenError } from "@/shared/errors";
import type { Clock } from "@/shared/time";
import type { PaymentAuthorizationResource } from "../authorization/payment-authorization";
import type { PaymentHistory, PaymentMutationResult, StaffPaymentDetail, StaffPaymentListItem } from "../dto/payment-dto";
import type { CancelPaymentCommand, ConfirmPaymentCommand, PaymentMutationRepository, PaymentQueryRepository, PaymentQueryScope } from "../ports/payment-repositories";
import { PaymentAdministration } from "./payment-administration";

const occurredAt = new Date("2026-08-04T09:00:00.000Z");
const expectedUpdatedAt = "2026-08-04T08:00:00.000Z";
const manager: AuthenticatedActor = { userId: "manager", username: "manager", role: "MANAGER" };
const sale: AuthenticatedActor = { userId: "sale", username: "sale", role: "SALE" };
const resource: PaymentAuthorizationResource = {
  applicationStatus: "VALID", ownerId: sale.userId, ownerManagerId: manager.userId, paymentStatus: "PENDING",
};

class FakeRepository implements PaymentQueryRepository, PaymentMutationRepository {
  confirmCommand: ConfirmPaymentCommand | null = null;
  cancelCommand: CancelPaymentCommand | null = null;
  constructor(readonly authorizationResource: PaymentAuthorizationResource | null = resource) {}
  async findAuthorizationResourceByApplicationId() { return this.authorizationResource; }
  async findAuthorizationResourceByPaymentId() { return this.authorizationResource; }
  async findDetailByApplicationId(_id: string, _scope: PaymentQueryScope): Promise<StaffPaymentDetail | null> { return null; }
  async findDetailByPaymentId(_id: string, _scope: PaymentQueryScope): Promise<StaffPaymentDetail | null> { return null; }
  async findHistoryByApplicationId(_id: string, _scope: PaymentQueryScope): Promise<PaymentHistory | null> { return null; }
  async list(_scope: PaymentQueryScope): Promise<readonly StaffPaymentListItem[]> { return []; }
  async confirm(command: ConfirmPaymentCommand): Promise<PaymentMutationResult> {
    this.confirmCommand = command;
    return { id: "payment", applicationId: command.applicationId, status: "CONFIRMED", updatedAt: command.occurredAt };
  }
  async cancel(command: CancelPaymentCommand): Promise<PaymentMutationResult> {
    this.cancelCommand = command;
    return { id: "payment", applicationId: command.applicationId, status: "CANCELLED", updatedAt: command.occurredAt };
  }
}

const clock: Clock = { now: () => occurredAt, today: () => "2026-08-04" };

describe("PaymentAdministration", () => {
  it("normalizes confirmation note and supplies trusted transition fields", async () => {
    const repository = new FakeRepository();
    await new PaymentAdministration(repository, repository, undefined, clock).confirm(manager, "application", {
      expectedStatus: "PENDING", expectedUpdatedAt, confirmationNote: "  received  ",
    }, "request-1");
    assert.deepEqual(repository.confirmCommand, {
      actor: manager, applicationId: "application", confirmationNote: "received",
      expectedStatus: "PENDING", expectedUpdatedAt: new Date(expectedUpdatedAt), occurredAt, requestId: "request-1",
    });
  });

  it("does not call the repository when SALE attempts a mutation", async () => {
    const repository = new FakeRepository();
    await assert.rejects(new PaymentAdministration(repository, repository, undefined, clock).confirm(sale, "application", {
      expectedStatus: "PENDING", expectedUpdatedAt,
    }, "request-2"), ForbiddenError);
    assert.equal(repository.confirmCommand, null);
  });

  it("preserves the required normalized cancellation reason", async () => {
    const repository = new FakeRepository({ ...resource, paymentStatus: "CONFIRMED" });
    await new PaymentAdministration(repository, repository, undefined, clock).cancel(manager, "application", {
      expectedStatus: "CONFIRMED", expectedUpdatedAt, reason: "  bank reversal  ",
    }, "request-3");
    assert.equal(repository.cancelCommand?.reason, "bank reversal");
    assert.equal(repository.cancelCommand?.occurredAt, occurredAt);
  });
});
