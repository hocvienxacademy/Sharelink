import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuthenticatedActor } from "@/shared/authorization";
import type {
  AdminApplicationQueryRepository,
  ApplicationQueryScope,
} from "../ports/admin-application-query-repository";
import type { StaffApplicationAuthorizationResource } from "../authorization/staff-application-authorization";
import { QueryStaffApplications } from "./query-staff-applications";

const sale: AuthenticatedActor = { userId: "sale-1", username: "sale", role: "SALE" };
const manager: AuthenticatedActor = { userId: "manager-1", username: "manager", role: "MANAGER" };

class FakeRepository implements AdminApplicationQueryRepository {
  scope: ApplicationQueryScope | null = null;
  resource: StaffApplicationAuthorizationResource | null = {
    ownerId: sale.userId,
    ownerManagerId: manager.userId,
  };
  async list(scope: ApplicationQueryScope) {
    this.scope = scope;
    return [];
  }
  async findAuthorizationResource() {
    return this.resource;
  }
  async findDetail() {
    return null;
  }
}

describe("QueryStaffApplications", () => {
  it("passes a server-derived SALE scope to persistence", async () => {
    const repository = new FakeRepository();
    await new QueryStaffApplications(repository).list(sale);
    assert.deepEqual(repository.scope, { kind: "sale", saleId: sale.userId });
  });

  it("hides an out-of-scope application from SALE", async () => {
    const repository = new FakeRepository();
    repository.resource = { ownerId: "sale-2", ownerManagerId: manager.userId };
    assert.equal(
      await new QueryStaffApplications(repository).detail(sale, "application-1"),
      null,
    );
  });
});
