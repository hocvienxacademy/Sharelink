import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { ConflictError } from "../../../src/shared/errors/index";
import { hashPassword, verifyPassword } from "../../../src/modules/auth/infrastructure/security/password";
import { PrismaUserRepository } from "../../../src/modules/users/infrastructure/prisma-user-repository";
import { TEST_IDS } from "../../fixtures/test-data";
import { withTestClient } from "../../helpers/test-database";

const email = "created-user@test.invalid";
const username = "created-user";

after(async () => {
  await withTestClient(async (client) => {
    const users = await client.query<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);
    for (const user of users.rows) {
      await client.query("DELETE FROM audit_logs WHERE entity_id = $1", [user.id]);
      await client.query("DELETE FROM users WHERE id = $1", [user.id]);
    }
  });
});

describe("PrismaUserRepository", () => {
  it("atomically creates a user and a PII-minimized audit record", async () => {
    const repository = new PrismaUserRepository();
    const clearPassword = "integration-password";
    const user = await repository.create({
      actorId: TEST_IDS.admin,
      fullName: "Created User",
      username,
      email,
      phone: "0900000099",
      role: "SALE",
      managerId: null,
      passwordHash: await hashPassword(clearPassword),
    });

    const persisted = await withTestClient((client) =>
      client.query<{
        password_hash: string;
        username: string;
        action: string;
        new_values: { role?: string; status?: string; managerId?: string | null };
      }>(
        `SELECT u.username, u.password_hash, a.action, a.new_values
         FROM users u
         JOIN audit_logs a ON a.entity_id = u.id
         WHERE u.id = $1 AND a.action = 'USER_CREATED'`,
        [user.id],
      ),
    );
    assert.equal(persisted.rowCount, 1);
    assert.equal(persisted.rows[0]?.username, username);
    assert.notEqual(persisted.rows[0]?.password_hash, clearPassword);
    assert.deepEqual(persisted.rows[0]?.new_values, { role: "SALE", status: "ACTIVE", managerId: null });
    assert.equal(JSON.stringify(persisted.rows[0]?.new_values).includes(email), false);

    await assert.rejects(
      repository.create({
        actorId: TEST_IDS.admin,
        fullName: "Duplicate User",
        username: username.toUpperCase(),
        email: "other-user@test.invalid",
        phone: null,
        role: "MANAGER",
        managerId: null,
        passwordHash: await hashPassword("another-password"),
      }),
      ConflictError,
    );

    await assert.rejects(
      repository.create({
        actorId: TEST_IDS.admin,
        fullName: "Duplicate Email User",
        username: "other-created-user",
        email: email.toUpperCase(),
        phone: null,
        role: "MANAGER",
        managerId: null,
        passwordHash: await hashPassword("another-password"),
      }),
      ConflictError,
    );

    await assert.rejects(
      withTestClient((client) =>
        client.query(
          `INSERT INTO users (username, full_name, email, password_hash, role)
           VALUES ($1, 'Bypass User', 'bypass@test.invalid', 'hash', 'SALE')`,
          [username.toUpperCase()],
        ),
      ),
    );
  });

  it("enforces scoped reads, lifecycle transitions, security unlock and atomic session revocation", async () => {
    const repository = new PrismaUserRepository();
    const admin = { userId: TEST_IDS.admin, username: "admin", role: "ADMIN" as const };
    const manager = await repository.create({ actorId: admin.userId, fullName: "Lifecycle Manager", username: "lifecycle-manager", email: "lifecycle-manager@test.invalid", phone: null, role: "MANAGER", managerId: null, passwordHash: await hashPassword("manager-password") });
    const sale = await repository.create({ actorId: admin.userId, fullName: "Lifecycle Sale", username: "lifecycle-sale", email: "lifecycle-sale@test.invalid", phone: null, role: "SALE", managerId: manager.id, passwordHash: await hashPassword("sale-password") });
    const managerActor = { userId: manager.id, username: "lifecycle-manager", role: "MANAGER" as const };
    const context = { requestId: "integration-user-lifecycle" };
    const expected = async () => {
      const detail = await repository.findDetail(admin, sale.id);
      assert.ok(detail);
      return { expectedRole: detail.role, expectedStatus: detail.status, expectedUpdatedAt: detail.updatedAt.toISOString() };
    };
    try {
      assert.deepEqual((await repository.list(managerActor)).map((item) => item.id), [sale.id]);
      const scoped = await repository.findDetail(managerActor, sale.id);
      assert.equal(scoped?.email, null);

      await withTestClient((client) => client.query("UPDATE users SET failed_login_attempts = 5, locked_until = NOW() + INTERVAL '15 minutes', updated_at = NOW() WHERE id = $1", [sale.id]));
      await repository.unlockSecurity({ actor: admin, id: sale.id, context, values: await expected() });
      const unlocked = await repository.findDetail(admin, sale.id);
      assert.equal(unlocked?.failedLoginAttempts, 0); assert.equal(unlocked?.lockedUntil, null);

      await withTestClient((client) => client.query("INSERT INTO app_sessions (sid, sess, expire) VALUES ('lifecycle-session-1', $1::json, NOW() + INTERVAL '1 hour')", [JSON.stringify({ userId: sale.id, role: "SALE", issuedAt: new Date().toISOString() })]));
      const replacement = "replacement-password";
      await repository.resetPassword({ actor: admin, id: sale.id, context, values: await expected(), passwordHash: await hashPassword(replacement) });
      const persisted = await withTestClient((client) => client.query<{ password_hash: string; sessions: string }>("SELECT u.password_hash, (SELECT COUNT(*)::text FROM app_sessions WHERE sess->>'userId' = u.id::text) sessions FROM users u WHERE u.id = $1", [sale.id]));
      assert.equal(await verifyPassword(replacement, persisted.rows[0]!.password_hash), true);
      assert.equal(persisted.rows[0]!.sessions, "0");

      const disabled = await repository.transitionAccount({ actor: admin, id: sale.id, context, targetStatus: "DISABLED", values: await expected() });
      assert.equal(disabled.status, "DISABLED");
      await assert.rejects(repository.transitionAccount({ actor: admin, id: sale.id, context, targetStatus: "DISABLED", values: { expectedRole: disabled.role, expectedStatus: disabled.status, expectedUpdatedAt: disabled.updatedAt.toISOString() } }), ConflictError);
      const enabled = await repository.transitionAccount({ actor: admin, id: sale.id, context, targetStatus: "ACTIVE", values: { expectedRole: disabled.role, expectedStatus: disabled.status, expectedUpdatedAt: disabled.updatedAt.toISOString() } });
      assert.equal(enabled.status, "ACTIVE");

      const changed = await repository.changeRole({ actor: admin, id: sale.id, context, values: { ...(await expected()), role: "MANAGER" } });
      assert.equal(changed.role, "MANAGER");
      assert.equal((await repository.findDetail(admin, sale.id))?.managerId, null);
    } finally {
      await withTestClient(async (client) => {
        await client.query("DELETE FROM app_sessions WHERE sess->>'userId' IN ($1, $2)", [sale.id, manager.id]);
        await client.query("DELETE FROM audit_logs WHERE entity_id IN ($1, $2)", [sale.id, manager.id]);
        await client.query("DELETE FROM users WHERE id = $1", [sale.id]);
        await client.query("DELETE FROM users WHERE id = $1", [manager.id]);
      });
    }
  });

  it("serializes concurrent last-active-admin changes with the global advisory lock", async () => {
    const repository = new PrismaUserRepository();
    const passwordHash = await hashPassword("concurrency-password");
    const actorUser = await repository.create({ actorId: TEST_IDS.admin, fullName: "Disabled Admin Actor", username: "disabled-admin-actor", email: "disabled-admin-actor@test.invalid", phone: null, role: "ADMIN", managerId: null, passwordHash });
    const first = await repository.create({ actorId: TEST_IDS.admin, fullName: "Concurrent Admin One", username: "concurrent-admin-one", email: "concurrent-admin-one@test.invalid", phone: null, role: "ADMIN", managerId: null, passwordHash });
    const second = await repository.create({ actorId: TEST_IDS.admin, fullName: "Concurrent Admin Two", username: "concurrent-admin-two", email: "concurrent-admin-two@test.invalid", phone: null, role: "ADMIN", managerId: null, passwordHash });
    const actor = { userId: actorUser.id, username: "disabled-admin-actor", role: "ADMIN" as const };
    const context = { requestId: "last-active-admin-concurrency" };
    try {
      await withTestClient((client) => client.query("UPDATE users SET is_active = false, updated_at = NOW() WHERE id IN ($1, $2)", [TEST_IDS.admin, actorUser.id]));
      const [firstDetail, secondDetail] = await Promise.all([repository.findDetail(actor, first.id), repository.findDetail(actor, second.id)]);
      assert.ok(firstDetail); assert.ok(secondDetail);
      const attempts = await Promise.allSettled([
        repository.transitionAccount({ actor, id: first.id, context, targetStatus: "DISABLED", values: { expectedRole: firstDetail.role, expectedStatus: firstDetail.status, expectedUpdatedAt: firstDetail.updatedAt.toISOString() } }),
        repository.transitionAccount({ actor, id: second.id, context, targetStatus: "DISABLED", values: { expectedRole: secondDetail.role, expectedStatus: secondDetail.status, expectedUpdatedAt: secondDetail.updatedAt.toISOString() } }),
      ]);
      assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
      assert.equal(attempts.filter((attempt) => attempt.status === "rejected" && attempt.reason instanceof ConflictError).length, 1);
      const activeAdmins = await withTestClient((client) => client.query<{ count: string }>("SELECT COUNT(*)::text count FROM users WHERE role = 'ADMIN' AND is_active = true"));
      assert.equal(activeAdmins.rows[0]?.count, "1");
    } finally {
      await withTestClient(async (client) => {
        await client.query("UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1", [TEST_IDS.admin]);
        await client.query("DELETE FROM audit_logs WHERE entity_id IN ($1, $2, $3) OR actor_id = $1", [actorUser.id, first.id, second.id]);
        await client.query("DELETE FROM users WHERE id IN ($1, $2, $3)", [first.id, second.id, actorUser.id]);
      });
    }
  });
});
