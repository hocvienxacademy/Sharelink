import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import type { AuthenticatedActor } from "../../../src/shared/authorization";
import { ConflictError } from "../../../src/shared/errors";
import { BankAccountAdministrationService } from "../../../src/modules/catalogs";
import { PrismaBankAccountManagementRepository } from "../../../src/modules/catalogs/infrastructure/prisma-bank-account-management-repository";
import { TEST_IDS } from "../../fixtures/test-data";
import { withTestClient } from "../../helpers/test-database";

const repository = new PrismaBankAccountManagementRepository();
const service = new BankAccountAdministrationService(repository);
const admin: AuthenticatedActor = { userId: TEST_IDS.admin, username: "admin", role: "ADMIN" };
const sale: AuthenticatedActor = { userId: TEST_IDS.sale, username: "sale", role: "SALE" };
const manager: AuthenticatedActor = { userId: TEST_IDS.manager, username: "manager", role: "MANAGER" };
const accountIds: string[] = [];
const linkIds: string[] = [];
let originalDefaultId: string | null = null;

before(async () => {
  await withTestClient(async (client) => {
    const result = await client.query<{ id: string }>("SELECT id FROM bank_accounts WHERE is_default=true");
    originalDefaultId = result.rows[0]?.id ?? null;
  });
});

after(async () => {
  await withTestClient(async (client) => {
    for (const linkId of linkIds) {
      await client.query("DELETE FROM applications WHERE registration_link_id=$1", [linkId]);
      await client.query("DELETE FROM registration_links WHERE id=$1", [linkId]);
    }
    await client.query("UPDATE bank_accounts SET is_default=false WHERE id=ANY($1::uuid[])", [accountIds]);
    if (originalDefaultId !== null) await client.query("UPDATE bank_accounts SET is_default=true, is_active=true WHERE id=$1", [originalDefaultId]);
    await client.query("DELETE FROM audit_logs WHERE entity_id=ANY($1::uuid[])", [accountIds]);
    await client.query("DELETE FROM bank_accounts WHERE id=ANY($1::uuid[])", [accountIds]);
  });
});

const context = (requestId: string) => ({ requestId });
async function createAccount(suffix: string) {
  const result = await service.create(admin, {
    bankCode: ` t${suffix} `,
    bankName: `Integration Bank ${suffix}`,
    branchName: "Main",
    accountNumber: `00${Date.now()}${suffix.replace(/\D/g, "")}`.slice(0, 50),
    accountName: "TEST SCHOOL",
  }, context(`create-${suffix}`));
  accountIds.push(result.id);
  return result;
}

describe("bank account management PostgreSQL workflow", () => {
  it("creates inactive/non-default records and scopes masked reads", async () => {
    const created = await createAccount("01");
    assert.equal(created.bankCode, "T01");
    assert.equal(created.isActive, false);
    assert.equal(created.isDefault, false);
    assert.match(created.accountNumber ?? "", /^0/);
    assert.equal((await repository.list(sale)).some((item) => item.id === created.id), false);
    const managerItem = (await repository.list(manager)).find((item) => item.id === created.id);
    assert.equal(managerItem?.accountNumber, null);
    assert.notEqual(managerItem?.maskedAccountNumber, created.accountNumber);
    const adminItem = (await repository.list(admin)).find((item) => item.id === created.id);
    assert.equal(adminItem?.accountNumber, created.accountNumber);
  });

  it("serializes default switching so only one request with the same observation succeeds", async () => {
    const first = await createAccount("02");
    const second = await createAccount("03");
    const activeFirst = await service.transition(admin, first.id, true, { expectedUpdatedAt: first.updatedAt.toISOString() }, context("activate-first"));
    const activeSecond = await service.transition(admin, second.id, true, { expectedUpdatedAt: second.updatedAt.toISOString() }, context("activate-second"));
    const results = await Promise.allSettled([
      service.setDefault(admin, first.id, { expectedUpdatedAt: activeFirst.updatedAt.toISOString(), expectedCurrentDefaultId: originalDefaultId }, context("default-first")),
      service.setDefault(admin, second.id, { expectedUpdatedAt: activeSecond.updatedAt.toISOString(), expectedCurrentDefaultId: originalDefaultId }, context("default-second")),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected" && result.reason instanceof ConflictError).length, 1);
    const publicAccount = await repository.findPublicDefault();
    assert.notEqual(publicAccount, null);
    assert.equal([first.accountNumber, second.accountNumber].includes(publicAccount!.accountNumber), true);
    await withTestClient(async (client) => {
      const defaults = await client.query("SELECT count(*)::int AS count FROM bank_accounts WHERE is_default=true");
      assert.equal(defaults.rows[0].count, 1);
      const audits = await client.query("SELECT metadata::text AS metadata FROM audit_logs WHERE entity_id=ANY($1::uuid[]) AND action='BANK_ACCOUNT_DEFAULT_CHANGED'", [[first.id, second.id]]);
      assert.equal(audits.rows.length, 1);
      assert.equal(audits.rows[0].metadata.includes(first.accountNumber!), false);
      assert.equal(audits.rows[0].metadata.includes(second.accountNumber!), false);
    });
    const winner = results.find((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof service.setDefault>>> => result.status === "fulfilled")!.value;
    await assert.rejects(service.transition(admin, winner.id, false, { expectedUpdatedAt: winner.updatedAt.toISOString() }, context("deactivate-default")), ConflictError);
    const cleared = await service.clearDefault(admin, winner.id, { expectedUpdatedAt: winner.updatedAt.toISOString() }, context("clear-default"));
    assert.equal(cleared.isDefault, false);
    assert.equal(await repository.findPublicDefault(), null);
    await assert.rejects(service.clearDefault(admin, winner.id, { expectedUpdatedAt: cleared.updatedAt.toISOString() }, context("clear-default-repeat")), ConflictError);
  });

  it("locks referenced identity fields while preserving payment snapshots", async () => {
    const created = await createAccount("04");
    const linkId = randomUUID(); const applicationId = randomUUID(); linkIds.push(linkId);
    await withTestClient(async (client) => {
      await client.query("INSERT INTO registration_links (id, public_token, sale_id, status, expires_at) VALUES ($1,$2,$3,'ACTIVE',CURRENT_TIMESTAMP + INTERVAL '1 day')", [linkId, randomUUID(), TEST_IDS.sale]);
      await client.query("INSERT INTO applications (id, registration_link_id, sale_id, status, version) VALUES ($1,$2,$3,'VALID',1)", [applicationId, linkId, TEST_IDS.sale]);
      await client.query("INSERT INTO payment_confirmations (application_id, bank_account_id, bank_name, account_number, account_name, transfer_content) VALUES ($1,$2,$3,$4,$5,'SNAPSHOT')", [applicationId, created.id, created.bankName, created.accountNumber, created.accountName]);
    });
    await assert.rejects(service.update(admin, created.id, { expectedUpdatedAt: created.updatedAt.toISOString(), accountNumber: "009999" }, context("blocked-number")), ConflictError);
    const renamed = await service.update(admin, created.id, { expectedUpdatedAt: created.updatedAt.toISOString(), bankName: "Renamed Bank", accountName: "RENAMED SCHOOL" }, context("rename"));
    assert.equal(renamed.bankName, "Renamed Bank");
    await withTestClient(async (client) => {
      const snapshot = await client.query("SELECT bank_name, account_name, account_number FROM payment_confirmations WHERE application_id=$1", [applicationId]);
      assert.equal(snapshot.rows[0].bank_name, created.bankName);
      assert.equal(snapshot.rows[0].account_name, created.accountName);
      assert.equal(snapshot.rows[0].account_number, created.accountNumber);
    });
  });
});
