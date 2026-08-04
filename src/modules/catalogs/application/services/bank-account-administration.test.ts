import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuthenticatedActor } from "@/shared/authorization";
import { ForbiddenError, ValidationError } from "@/shared/errors";
import { BankAccountAuthorizationPolicy } from "../authorization/bank-account-authorization";
import type { BankAccountManagementRepository, ManagedBankAccount } from "../ports/bank-account-management-repository";
import { BankAccountAdministrationService, QueryManagedBankAccounts } from "./bank-account-administration";

const account: ManagedBankAccount = {
  id: "11111111-1111-4111-8111-111111111111", bankCode: "VCB", bankName: "Vietcombank",
  branchName: null, accountNumber: "001234", maskedAccountNumber: "**1234", accountName: "TRUONG A",
  isDefault: false, isActive: false, updatedAt: new Date("2026-08-01T00:00:00.000Z"),
};
const actor = (role: AuthenticatedActor["role"]): AuthenticatedActor => ({ userId: "22222222-2222-4222-8222-222222222222", username: role.toLowerCase(), role });

function fakeRepository() {
  const calls: Array<{ readonly name: string; readonly value?: unknown }> = [];
  const repository: BankAccountManagementRepository = {
    list: async (value) => { calls.push({ name: "list", value }); return [account]; },
    find: async () => account,
    findPublicDefault: async () => null,
    findHistory: async () => [],
    create: async (_actor, values) => { calls.push({ name: "create", value: values }); return account; },
    update: async (command) => { calls.push({ name: "update", value: command }); return account; },
    transition: async (command) => { calls.push({ name: "transition", value: command }); return account; },
    setDefault: async (command) => { calls.push({ name: "setDefault", value: command }); return account; },
    clearDefault: async (command) => { calls.push({ name: "clearDefault", value: command }); return account; },
  };
  return { repository, calls };
}

describe("BankAccountAuthorizationPolicy", () => {
  it("allows scoped reads to all staff and reserves mutations/history for ADMIN", () => {
    const policy = new BankAccountAuthorizationPolicy();
    for (const role of ["SALE", "MANAGER", "ADMIN"] as const) assert.equal(policy.authorize("bankAccount.list", actor(role)).allowed, true);
    assert.equal(policy.authorize("bankAccount.create", actor("SALE")).allowed, false);
    assert.equal(policy.authorize("bankAccount.viewHistory", actor("MANAGER")).allowed, false);
    assert.equal(policy.authorize("bankAccount.setDefault", actor("ADMIN")).allowed, true);
    assert.equal(policy.authorize("bankAccount.delete", actor("ADMIN")).allowed, false);
    assert.equal(policy.authorize("bankAccount.list", null).allowed, false);
  });
});

describe("bank account administration", () => {
  it("normalizes code, preserves leading zeroes, and never accepts state mass assignment", async () => {
    const { repository, calls } = fakeRepository();
    const service = new BankAccountAdministrationService(repository);
    await service.create(actor("ADMIN"), { bankCode: " vcb ", bankName: " Vietcombank ", accountNumber: "001234", accountName: " TRUONG A ", branchName: " " }, { requestId: "create" });
    assert.deepEqual(calls[0]?.value, { bankCode: "VCB", bankName: "Vietcombank", accountNumber: "001234", accountName: "TRUONG A", branchName: null });
    await assert.rejects(service.create(actor("ADMIN"), { bankCode: "VCB", bankName: "VCB", accountNumber: "12A", accountName: "A" }, { requestId: "bad" }), ValidationError);
    await assert.rejects(service.create(actor("ADMIN"), { bankCode: "VCB", bankName: "VCB", accountNumber: "123", accountName: "A", isActive: true }, { requestId: "mass" }), ValidationError);
  });

  it("denies SALE/MANAGER mutations and history before repository access", async () => {
    const { repository, calls } = fakeRepository();
    const service = new BankAccountAdministrationService(repository);
    const queries = new QueryManagedBankAccounts(repository);
    await assert.rejects(service.create(actor("SALE"), {}, { requestId: "sale" }), ForbiddenError);
    await assert.rejects(queries.history(actor("MANAGER"), account.id), ForbiddenError);
    assert.equal(calls.length, 0);
  });

  it("requires optimistic versions and the observed current default for default switching", async () => {
    const { repository, calls } = fakeRepository();
    const service = new BankAccountAdministrationService(repository);
    await service.setDefault(actor("ADMIN"), account.id, { expectedUpdatedAt: account.updatedAt.toISOString(), expectedCurrentDefaultId: null }, { requestId: "default" });
    assert.equal(calls[0]?.name, "setDefault");
    await assert.rejects(service.setDefault(actor("ADMIN"), account.id, { expectedUpdatedAt: account.updatedAt.toISOString() }, { requestId: "missing" }), ValidationError);
  });
});
