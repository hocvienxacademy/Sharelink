import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { afterEach, describe, it } from "node:test";
import { adminAuthentication } from "../../../src/composition/auth";
import {
  AdminAuthenticationService,
  type AuthenticationRepository,
} from "../../../src/modules/auth/application/authentication";
import { PrismaAuthenticationRepository } from "../../../src/modules/auth/infrastructure/prisma-authentication-repository";
import { verifyPasswordOrDummy } from "../../../src/modules/auth/infrastructure/security/password";
import {
  AccountDisabledError,
  AccountLockedError,
  ConflictError,
  UnauthorizedError,
} from "../../../src/shared/errors/index";
import { TEST_IDS } from "../../fixtures/test-data";
import { withTestClient } from "../../helpers/test-database";

const credentials = {
  username: "admin",
  password: "admin-test-password",
};

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

async function resetAdminAuthenticationState(): Promise<void> {
  await withTestClient(async (client) => {
    await client.query("DELETE FROM app_sessions");
    await client.query(
      `UPDATE users
       SET is_active = true,
           failed_login_attempts = 0,
           locked_until = NULL,
           last_login_at = NULL
       WHERE id = $1`,
      [TEST_IDS.admin],
    );
  });
}

afterEach(resetAdminAuthenticationState);

describe("PostgreSQL authentication lifecycle", () => {
  it("stores a hashed, expiring session and resolves the current identity", async () => {
    await resetAdminAuthenticationState();
    const session = await adminAuthentication.authenticate(credentials);
    const persisted = await withTestClient((client) =>
      client.query<{
        expire_epoch_ms: string;
        sess: { role?: string; userId?: string };
        sid: string;
      }>(
        "SELECT sid, sess, (EXTRACT(EPOCH FROM expire) * 1000)::text AS expire_epoch_ms FROM app_sessions",
      ),
    );

    assert.equal(persisted.rowCount, 1);
    assert.equal(persisted.rows[0]?.sid.length, 64);
    assert.notEqual(persisted.rows[0]?.sid, session.token);
    assert.equal(persisted.rows[0]?.sess.userId, TEST_IDS.admin);
    assert.equal(persisted.rows[0]?.sess.role, "ADMIN");
    assert.equal(
      Number(persisted.rows[0]?.expire_epoch_ms),
      session.expiresAt.getTime(),
    );
    assert.equal((await adminAuthentication.getIdentity(session.token))?.username, "admin");
  });

  it("does not create sessions for invalid, locked, disabled, or unknown accounts", async () => {
    await resetAdminAuthenticationState();
    await assert.rejects(
      adminAuthentication.authenticate({ ...credentials, password: "wrong" }),
      UnauthorizedError,
    );
    await assert.rejects(
      adminAuthentication.authenticate({ username: "missing", password: "wrong" }),
      UnauthorizedError,
    );

    await withTestClient((client) =>
      client.query(
        "UPDATE users SET locked_until = CURRENT_TIMESTAMP + INTERVAL '15 minutes' WHERE id = $1",
        [TEST_IDS.admin],
      ),
    );
    await assert.rejects(
      adminAuthentication.authenticate(credentials),
      AccountLockedError,
    );

    await withTestClient((client) =>
      client.query(
        "UPDATE users SET locked_until = NULL, is_active = false WHERE id = $1",
        [TEST_IDS.admin],
      ),
    );
    await assert.rejects(
      adminAuthentication.authenticate(credentials),
      AccountDisabledError,
    );

    const count = await withTestClient((client) =>
      client.query<{ count: string }>("SELECT COUNT(*) AS count FROM app_sessions"),
    );
    assert.equal(count.rows[0]?.count, "0");
  });

  it("revokes sessions idempotently and refuses reuse or expiry", async () => {
    await resetAdminAuthenticationState();
    const first = await adminAuthentication.authenticate(credentials);
    await adminAuthentication.revoke(first.token);
    await adminAuthentication.revoke(first.token);
    assert.equal(await adminAuthentication.getIdentity(first.token), null);

    const expired = await adminAuthentication.authenticate(credentials);
    await withTestClient((client) =>
      client.query("UPDATE app_sessions SET expire = $1", [new Date(0)]),
    );
    assert.equal(await adminAuthentication.getIdentity(expired.token), null);
    assert.equal(await adminAuthentication.getIdentity("invalid-session-token"), null);
  });

  it("rejects an existing session after its user is locked or disabled", async () => {
    await resetAdminAuthenticationState();
    const lockedSession = await adminAuthentication.authenticate(credentials);
    await withTestClient((client) =>
      client.query(
        "UPDATE users SET locked_until = CURRENT_TIMESTAMP + INTERVAL '15 minutes' WHERE id = $1",
        [TEST_IDS.admin],
      ),
    );
    assert.equal(await adminAuthentication.getIdentity(lockedSession.token), null);

    await resetAdminAuthenticationState();
    const disabledSession = await adminAuthentication.authenticate(credentials);
    await withTestClient((client) =>
      client.query("UPDATE users SET is_active = false WHERE id = $1", [
        TEST_IDS.admin,
      ]),
    );
    assert.equal(await adminAuthentication.getIdentity(disabledSession.token), null);
  });

  it("supports two concurrent logins with independent sessions", async () => {
    await resetAdminAuthenticationState();
    const [first, second] = await Promise.all([
      adminAuthentication.authenticate(credentials),
      adminAuthentication.authenticate(credentials),
    ]);
    assert.notEqual(first.token, second.token);
    const count = await withTestClient((client) =>
      client.query<{ count: string }>("SELECT COUNT(*) AS count FROM app_sessions"),
    );
    assert.equal(count.rows[0]?.count, "2");
  });

  it("does not clear a lock applied after credentials were read", async () => {
    await resetAdminAuthenticationState();
    const base = new PrismaAuthenticationRepository();
    const sessionReached = deferred();
    const releaseSession = deferred();
    const repository: AuthenticationRepository = {
      findAdminByUsername: (username) => base.findAdminByUsername(username),
      recordFailedLogin: (input) => base.recordFailedLogin(input),
      findIdentityBySessionId: (sessionId, now) =>
        base.findIdentityBySessionId(sessionId, now),
      revokeSession: (sessionId) => base.revokeSession(sessionId),
      createSession: async (input) => {
        sessionReached.resolve();
        await releaseSession.promise;
        await base.createSession(input);
      },
    };
    const service = new AdminAuthenticationService(repository, {
      verifyPassword: verifyPasswordOrDummy,
    });
    const login = service.authenticate(credentials);

    await sessionReached.promise;
    await base.recordFailedLogin({
      userId: TEST_IDS.admin,
      attemptedAt: new Date(),
      maximumAttempts: 1,
      lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
    });
    releaseSession.resolve();

    await assert.rejects(login, AccountLockedError);
    const state = await withTestClient((client) =>
      client.query<{ count: string; locked: boolean }>(
        `SELECT
           (SELECT COUNT(*) FROM app_sessions)::text AS count,
           locked_until > CURRENT_TIMESTAMP AS locked
         FROM users
         WHERE id = $1`,
        [TEST_IDS.admin],
      ),
    );
    assert.equal(state.rows[0]?.count, "0");
    assert.equal(state.rows[0]?.locked, true);
  });

  it("rolls back the user update when session creation conflicts", async () => {
    await resetAdminAuthenticationState();
    const collisionToken = "collision-token";
    const collisionId = createHash("sha256")
      .update(collisionToken)
      .digest("hex");
    await withTestClient((client) =>
      client.query(
        `INSERT INTO app_sessions (sid, sess, expire)
         VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP + INTERVAL '1 hour')`,
        [collisionId, JSON.stringify({ userId: TEST_IDS.admin, role: "ADMIN" })],
      ),
    );
    const service = new AdminAuthenticationService(
      new PrismaAuthenticationRepository(),
      { token: () => collisionToken, verifyPassword: verifyPasswordOrDummy },
    );

    await assert.rejects(service.authenticate(credentials), ConflictError);
    const user = await withTestClient((client) =>
      client.query<{ last_login_at: Date | null }>(
        "SELECT last_login_at FROM users WHERE id = $1",
        [TEST_IDS.admin],
      ),
    );
    assert.equal(user.rows[0]?.last_login_at, null);
  });
});
