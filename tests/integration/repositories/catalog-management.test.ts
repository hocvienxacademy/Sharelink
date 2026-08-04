import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import type { AuthenticatedActor } from "../../../src/shared/authorization";
import { ConflictError } from "../../../src/shared/errors";
import { CatalogAdministrationService } from "../../../src/modules/catalogs";
import { PrismaCatalogManagementRepository } from "../../../src/modules/catalogs/infrastructure/prisma-catalog-management-repository";
import { TEST_IDS } from "../../fixtures/test-data";
import { withTestClient } from "../../helpers/test-database";

const repository = new PrismaCatalogManagementRepository();
const service = new CatalogAdministrationService(repository);
const admin: AuthenticatedActor = { userId: TEST_IDS.admin, username: "admin", role: "ADMIN" };
const periodIds: string[] = [];
const majorIds: string[] = [];
const linkIds: string[] = [];
const context = (requestId: string) => ({ requestId });

after(async () => {
  await withTestClient(async (client) => {
    for (const linkId of linkIds) await client.query("DELETE FROM registration_links WHERE id=$1", [linkId]);
    for (const id of [...periodIds, ...majorIds]) await client.query("DELETE FROM audit_logs WHERE entity_id=$1", [id]);
    for (const id of periodIds) await client.query("DELETE FROM admission_periods WHERE id=$1", [id]);
    for (const id of majorIds) await client.query("DELETE FROM majors WHERE id=$1", [id]);
  });
});

describe("catalog management PostgreSQL workflow", () => {
  it("creates inactive periods and atomically rejects concurrent overlapping activation", async () => {
    const suffix = randomUUID().slice(0, 8);
    const first = await service.createAdmissionPeriod(admin, { code: `P1-${suffix}`, name: "Future period one", startDate: "2035-01-01", endDate: "2035-03-31" }, context("period-create-1"));
    const second = await service.createAdmissionPeriod(admin, { code: `P2-${suffix}`, name: "Future period two", startDate: "2035-02-01", endDate: "2035-04-30" }, context("period-create-2"));
    periodIds.push(first.id, second.id);
    assert.equal(first.isActive, false); assert.equal(second.isActive, false);
    const results = await Promise.allSettled([
      service.transitionAdmissionPeriod(admin, first.id, true, { expectedUpdatedAt: first.updatedAt.toISOString() }, context("period-activate-1")),
      service.transitionAdmissionPeriod(admin, second.id, true, { expectedUpdatedAt: second.updatedAt.toISOString() }, context("period-activate-2")),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected" && result.reason instanceof ConflictError).length, 1);
    await withTestClient(async (client) => {
      const rows = await client.query("SELECT count(*)::int AS count FROM admission_periods WHERE id=ANY($1::uuid[]) AND is_active=true", [[first.id, second.id]]);
      assert.equal(rows.rows[0].count, 1);
      const audits = await client.query("SELECT action, metadata::text AS metadata FROM audit_logs WHERE entity_id=ANY($1::uuid[])", [[first.id, second.id]]);
      assert.equal(audits.rows.filter((row) => row.action === "ADMISSION_PERIOD_ACTIVATED").length, 1);
      assert.equal(audits.rows.every((row) => row.metadata.includes("requestId") || row.action.endsWith("CREATED")), true);
    });
  });

  it("locks referenced period fields, rejects stale writes, and blocks deactivation used by ACTIVE links", async () => {
    const period = (await repository.listAdmissionPeriods(true)).find((item) => periodIds.includes(item.id) && item.isActive);
    assert.notEqual(period, undefined);
    const linkId = randomUUID(); linkIds.push(linkId);
    await withTestClient((client) => client.query(`INSERT INTO registration_links (id, public_token, sale_id, admission_period_id, status, expires_at) VALUES ($1,$2,$3,$4,'ACTIVE',CURRENT_TIMESTAMP + INTERVAL '30 day')`, [linkId, randomUUID(), TEST_IDS.sale, period!.id]));
    await assert.rejects(service.updateAdmissionPeriod(admin, period!.id, { expectedUpdatedAt: period!.updatedAt.toISOString(), code: `CHANGED-${randomUUID().slice(0, 4)}` }, context("period-code-change")), ConflictError);
    const renamed = await service.updateAdmissionPeriod(admin, period!.id, { expectedUpdatedAt: period!.updatedAt.toISOString(), name: "Renamed referenced period" }, context("period-rename"));
    await assert.rejects(service.updateAdmissionPeriod(admin, period!.id, { expectedUpdatedAt: period!.updatedAt.toISOString(), name: "Stale" }, context("period-stale")), ConflictError);
    await assert.rejects(service.transitionAdmissionPeriod(admin, period!.id, false, { expectedUpdatedAt: renamed.updatedAt.toISOString() }, context("period-deactivate-blocked")), ConflictError);
  });

  it("normalizes major code, keeps stable ordering, and preserves referenced inactive majors", async () => {
    const suffix = randomUUID().slice(0, 6).toUpperCase();
    const major = await service.createMajor(admin, { code: ` m-${suffix} `, name: `Integration major ${suffix}`, displayOrder: 7 }, context("major-create"));
    majorIds.push(major.id); assert.equal(major.code, `M-${suffix}`); assert.equal(major.isActive, false);
    const active = await service.transitionMajor(admin, major.id, true, { expectedUpdatedAt: major.updatedAt.toISOString() }, context("major-activate"));
    const linkId = randomUUID(); linkIds.push(linkId);
    await withTestClient((client) => client.query(`INSERT INTO registration_links (id, public_token, sale_id, major_id, status, expires_at) VALUES ($1,$2,$3,$4,'ACTIVE',CURRENT_TIMESTAMP + INTERVAL '30 day')`, [linkId, randomUUID(), TEST_IDS.sale, major.id]));
    await assert.rejects(service.updateMajor(admin, major.id, { expectedUpdatedAt: active.updatedAt.toISOString(), code: `X-${suffix}` }, context("major-code-blocked")), ConflictError);
    const updated = await service.updateMajor(admin, major.id, { expectedUpdatedAt: active.updatedAt.toISOString(), name: `Renamed ${suffix}`, displayOrder: 1 }, context("major-update"));
    await assert.rejects(service.transitionMajor(admin, major.id, false, { expectedUpdatedAt: updated.updatedAt.toISOString() }, context("major-deactivate-blocked")), ConflictError);
    await withTestClient((client) => client.query("UPDATE registration_links SET status='LOCKED' WHERE id=$1", [linkId]));
    const inactive = await service.transitionMajor(admin, major.id, false, { expectedUpdatedAt: updated.updatedAt.toISOString() }, context("major-deactivate"));
    assert.equal(inactive.isActive, false);
    const saleVisible = await repository.listMajors(false); assert.equal(saleVisible.some((item) => item.id === major.id), false);
    await withTestClient(async (client) => {
      const historical = await client.query("SELECT m.code, m.name FROM registration_links r JOIN majors m ON m.id=r.major_id WHERE r.id=$1", [linkId]);
      assert.equal(historical.rows[0].code, `M-${suffix}`); assert.equal(historical.rows[0].name, `Renamed ${suffix}`);
      const audit = await client.query("SELECT count(*)::int AS count FROM audit_logs WHERE entity_id=$1 AND action='MAJOR_DEACTIVATED'", [major.id]);
      assert.equal(audit.rows[0].count, 1);
    });
  });
});
