import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { ConflictError, ForbiddenError, InvalidStateTransitionError, ValidationError } from "../../../src/shared/errors/index";
import { PrismaAdminRegistrationLinkRepository } from "../../../src/modules/registration-links/infrastructure/prisma-admin-registration-link-repository";
import { RegistrationLinkAdministrationService } from "../../../src/modules/registration-links/application/services/registration-link-administration";
import { PrismaAdminRegistrationLinkQueryRepository } from "../../../src/modules/registration-links/infrastructure/prisma-admin-registration-link-queries";
import { QueryRegistrationLinks } from "../../../src/modules/registration-links/application/services/query-registration-links";
import { TEST_IDS } from "../../fixtures/test-data";
import { withTestClient } from "../../helpers/test-database";

const actor = { userId: TEST_IDS.admin, username: "admin", role: "ADMIN" as const };
const saleActor = { userId: TEST_IDS.sale, username: "sale-test", role: "SALE" as const };
const managerActor = { userId: TEST_IDS.manager, username: "manager-test", role: "MANAGER" as const };
const createdIds: string[] = [];
const fields = {
  saleId: TEST_IDS.sale,
  majorId: TEST_IDS.majorOne,
  studentNameHint: "Lifecycle Test",
  entryQualification: "THPT",
  paymentRound: "D1",
  internalNote: "not copied to audit",
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
};

after(async () => {
  await withTestClient(async (client) => {
    for (const id of createdIds) {
      await client.query("DELETE FROM audit_logs WHERE entity_id = $1", [id]);
      await client.query("DELETE FROM registration_links WHERE id = $1", [id]);
    }
  });
});

describe("registration link lifecycle PostgreSQL repository", () => {
  it("creates, scopes, updates and serializes the complete audited lifecycle", async () => {
    const repository = new PrismaAdminRegistrationLinkRepository();
    const service = new RegistrationLinkAdministrationService(repository);
    const queries = new QueryRegistrationLinks(new PrismaAdminRegistrationLinkQueryRepository());
    const context = { requestId: "integration-registration-link-lifecycle" };
    const created = await service.create(actor, fields, context);
    createdIds.push(created.id);
    assert.equal(created.status, "DRAFT");
    assert.equal(created.publicUrl, undefined);
    const createdPeriod = await withTestClient((client) => client.query<{ admission_period_id: string | null }>(
      "SELECT admission_period_id::text FROM registration_links WHERE id = $1",
      [created.id],
    ));
    assert.equal(createdPeriod.rows[0]?.admission_period_id, null);

    const { saleId: _saleId, ...editableFields } = fields;
    const updated = await service.updateDetails(actor, created.id, {
      ...editableFields,
      studentNameHint: "Updated",
      expectedStatus: "DRAFT",
      expectedUpdatedAt: created.updatedAt.toISOString(),
    }, context);
    await assert.rejects(service.updateDetails(actor, created.id, { ...editableFields, saleId: TEST_IDS.admin, expectedStatus: "DRAFT", expectedUpdatedAt: updated.updatedAt.toISOString() }, context), ValidationError);
    await assert.rejects(service.updateDetails(actor, created.id, { ...editableFields, publicToken: "forged", expectedStatus: "DRAFT", expectedUpdatedAt: updated.updatedAt.toISOString() }, context), ValidationError);
    await assert.rejects(service.create(saleActor, { ...fields, saleId: TEST_IDS.admin }, context), ForbiddenError);

    const scoped = await queries.list(saleActor);
    assert.equal(scoped.some((item) => item.id === created.id), true);
    const detail = await queries.detail(saleActor, created.id);
    assert.equal(detail?.studentNameHint, "Updated");
    assert.equal(detail?.publicUrl, null);

    await withTestClient((client) => client.query("UPDATE majors SET is_active = false WHERE id = $1", [TEST_IDS.majorOne]));
    const draftVersion = { expectedStatus: "DRAFT", expectedUpdatedAt: updated.updatedAt.toISOString() };
    await assert.rejects(
      service.transition(actor, created.id, "activate", draftVersion, context),
      (error: unknown) => {
        assert.equal(String(error).includes("Prisma"), false);
        assert.equal(String(error).includes("SELECT"), false);
        return true;
      },
    );
    const rolledBack = await withTestClient((client) => client.query<{ status: string; histories: string; audits: string }>(
      `SELECT l.status::text,
        (SELECT count(*)::text FROM registration_link_status_histories h WHERE h.registration_link_id = l.id) AS histories,
        (SELECT count(*)::text FROM audit_logs a WHERE a.entity_id = l.id) AS audits
       FROM registration_links l WHERE l.id = $1`,
      [created.id],
    ));
    assert.deepEqual(rolledBack.rows[0], { status: "DRAFT", histories: "1", audits: "2" });
    await withTestClient((client) => client.query("UPDATE majors SET is_active = true WHERE id = $1", [TEST_IDS.majorOne]));
    await withTestClient((client) => client.query("UPDATE registration_links SET admission_period_id = $2 WHERE id = $1", [created.id, TEST_IDS.closedPeriod]));

    const concurrent = await Promise.allSettled([
      service.transition(actor, created.id, "activate", draftVersion, context),
      service.transition(actor, created.id, "activate", draftVersion, context),
    ]);
    assert.equal(concurrent.filter((item) => item.status === "fulfilled").length, 1);
    const rejected = concurrent.find((item): item is PromiseRejectedResult => item.status === "rejected");
    assert.ok(rejected?.reason instanceof ConflictError);

    const activated = concurrent.find((item): item is PromiseFulfilledResult<Awaited<ReturnType<typeof service.transition>>> => item.status === "fulfilled")?.value;
    assert.ok(activated);
    const activeDetail = await queries.detail(saleActor, created.id);
    assert.match(activeDetail?.publicUrl ?? "", /^\/dang-ky\/[0-9a-f-]{36}$/);

    const locked = await service.transition(actor, created.id, "lock", { expectedStatus: "ACTIVE", expectedUpdatedAt: activated.updatedAt.toISOString(), reason: "temporary" }, context);
    const unlocked = await service.transition(actor, created.id, "unlock", { expectedStatus: "LOCKED", expectedUpdatedAt: locked.updatedAt.toISOString() }, context);
    const cancelled = await service.transition(actor, created.id, "cancel", { expectedStatus: "ACTIVE", expectedUpdatedAt: unlocked.updatedAt.toISOString(), reason: "test complete" }, context);
    await service.transition(actor, created.id, "archive", { expectedStatus: "CANCELLED", expectedUpdatedAt: cancelled.updatedAt.toISOString() }, context);

    const persisted = await withTestClient((client) => client.query<{
      audit_count: string;
      history_count: string;
      public_token: string;
      status: string;
      audit_payload: string;
    }>(
      `SELECT l.public_token::text, l.status::text,
        (SELECT count(*)::text FROM registration_link_status_histories h WHERE h.registration_link_id = l.id) AS history_count,
        (SELECT count(*)::text FROM audit_logs a WHERE a.entity_id = l.id) AS audit_count,
        (SELECT coalesce(jsonb_agg(jsonb_build_object('old', old_values, 'new', new_values, 'metadata', metadata))::text, '[]') FROM audit_logs a WHERE a.entity_id = l.id) AS audit_payload
       FROM registration_links l WHERE l.id = $1`,
      [created.id],
    ));
    assert.equal(persisted.rows[0]?.status, "ARCHIVED");
    assert.equal(persisted.rows[0]?.history_count, "6");
    assert.equal(persisted.rows[0]?.audit_count, "7");
    assert.equal(persisted.rows[0]?.audit_payload.includes(persisted.rows[0]?.public_token ?? "missing"), false);
    assert.equal((await queries.list(actor)).some((item) => item.id === created.id), false);
    assert.equal((await queries.list(actor, true)).some((item) => item.id === created.id), true);

    const protectedLink = await service.create(actor, { ...fields, studentNameHint: "Application preservation" }, context);
    createdIds.push(protectedLink.id);
    const applicationId = await withTestClient(async (client) => {
      const inserted = await client.query<{ id: string }>(
        "INSERT INTO applications (registration_link_id, sale_id) VALUES ($1, $2) RETURNING id::text",
        [protectedLink.id, TEST_IDS.sale],
      );
      return inserted.rows[0]!.id;
    });
    const cancelInput = {
      expectedStatus: "DRAFT",
      expectedUpdatedAt: protectedLink.updatedAt.toISOString(),
      reason: "must preserve application",
    };
    await assert.rejects(
      service.transition(actor, protectedLink.id, "cancel", cancelInput, context),
      InvalidStateTransitionError,
    );
    await assert.rejects(
      service.transition({ ...saleActor, userId: TEST_IDS.admin }, protectedLink.id, "cancel", cancelInput, context),
      ForbiddenError,
    );
    await assert.rejects(
      service.transition(managerActor, protectedLink.id, "cancel", cancelInput, context),
      ForbiddenError,
    );
    const preserved = await withTestClient((client) => client.query<{ applications: string; audits: string; status: string }>(
      `SELECT l.status::text,
        (SELECT count(*)::text FROM applications a WHERE a.registration_link_id = l.id) AS applications,
        (SELECT count(*)::text FROM audit_logs a WHERE a.entity_id = l.id) AS audits
       FROM registration_links l WHERE l.id = $1`,
      [protectedLink.id],
    ));
    assert.deepEqual(preserved.rows[0], { status: "DRAFT", applications: "1", audits: "1" });
    await withTestClient((client) => client.query("DELETE FROM applications WHERE id = $1", [applicationId]));

    const cancelRaceLink = await service.create(actor, { ...fields, studentNameHint: "Cancel race" }, context);
    createdIds.push(cancelRaceLink.id);
    const raceInput = {
      expectedStatus: "DRAFT",
      expectedUpdatedAt: cancelRaceLink.updatedAt.toISOString(),
      reason: "concurrent cancel",
    };
    const cancelRace = await Promise.allSettled([
      service.transition(actor, cancelRaceLink.id, "cancel", raceInput, context),
      service.transition(actor, cancelRaceLink.id, "cancel", raceInput, context),
    ]);
    assert.equal(cancelRace.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(cancelRace.filter((item) => item.status === "rejected").length, 1);
    const racePersistence = await withTestClient((client) => client.query<{ audits: string; histories: string; status: string }>(
      `SELECT l.status::text,
        (SELECT count(*)::text FROM registration_link_status_histories h WHERE h.registration_link_id = l.id) AS histories,
        (SELECT count(*)::text FROM audit_logs a WHERE a.entity_id = l.id) AS audits
       FROM registration_links l WHERE l.id = $1`,
      [cancelRaceLink.id],
    ));
    assert.deepEqual(racePersistence.rows[0], { status: "CANCELLED", histories: "2", audits: "2" });
  });
});
