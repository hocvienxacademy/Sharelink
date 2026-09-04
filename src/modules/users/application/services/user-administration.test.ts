import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ValidationError } from "@/shared/errors";
import type { UserManagementRepository } from "../ports/user-repository";
import { UserAdministrationService } from "./user-administration";

const actor = { userId: "10000000-0000-4000-8000-000000000010", username: "sale", role: "SALE" as const };
const expected = { expectedRole: "SALE" as const, expectedStatus: "ACTIVE" as const, expectedUpdatedAt: "2026-09-04T00:00:00.000Z" };

function service(passwordMatches: boolean) {
  let changedPasswordHash: string | null = null;
  const repository = {
    findAuthorizationResource: async () => ({ id: actor.userId, role: actor.role, managerId: null }),
    findPasswordHash: async () => "stored-hash",
    changeOwnPassword: async (command: { readonly passwordHash: string }) => {
      changedPasswordHash = command.passwordHash;
      return { id: actor.userId, role: actor.role, status: "ACTIVE" as const, updatedAt: new Date("2026-09-04T00:00:01.000Z") };
    },
  } as unknown as UserManagementRepository;
  return {
    changedPasswordHash: () => changedPasswordHash,
    service: new UserAdministrationService(
      repository,
      { hash: async (password) => `hashed:${password}` },
      { verify: async (password, hash) => passwordMatches && password === "current-password" && hash === "stored-hash" },
    ),
  };
}

describe("UserAdministrationService.changeOwnPassword", () => {
  it("verifies the current password before hashing and persisting the new password", async () => {
    const context = service(true);
    await context.service.changeOwnPassword(actor, { ...expected, currentPassword: "current-password", newPassword: "new-password" }, { requestId: "password-change" });
    assert.equal(context.changedPasswordHash(), "hashed:new-password");
  });

  it("rejects a wrong current password without persisting a replacement", async () => {
    const context = service(false);
    await assert.rejects(
      context.service.changeOwnPassword(actor, { ...expected, currentPassword: "wrong-password", newPassword: "new-password" }, { requestId: "password-change" }),
      ValidationError,
    );
    assert.equal(context.changedPasswordHash(), null);
  });
});
