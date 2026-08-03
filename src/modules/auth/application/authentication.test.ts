import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AccountDisabledError,
  AccountLockedError,
  ConflictError,
  DatabaseError,
  InternalServerError,
  UnauthorizedError,
  ValidationError,
} from "@/shared/errors";
import {
  AdminAuthenticationService,
  normalizeLoginUsername,
  parseLoginInput,
  type AdminAuthenticationRecord,
  type AdminIdentity,
  type AuthenticationRepository,
  type CreateAdminSessionInput,
} from "./authentication";

const NOW = new Date("2026-08-03T08:00:00.000Z");
const TOKEN = "a".repeat(43);

function admin(
  overrides: Partial<AdminAuthenticationRecord> = {},
): AdminAuthenticationRecord {
  return {
    id: "10000000-0000-4000-8000-000000000002",
    username: "admin",
    fullName: "Test Admin",
    email: "admin@test.invalid",
    passwordHash: "stored-hash",
    isActive: true,
    lockedUntil: null,
    role: "ADMIN",
    ...overrides,
  };
}

class FakeAuthenticationRepository implements AuthenticationRepository {
  user: AdminAuthenticationRecord | null = admin();
  identity: AdminIdentity | null = {
    id: admin().id,
    username: "admin",
    fullName: "Test Admin",
    email: "admin@test.invalid",
    role: "ADMIN",
  };
  createdSessions: CreateAdminSessionInput[] = [];
  failedUserIds: string[] = [];
  revokedSessionIds: string[] = [];
  createFailures: Error[] = [];
  findFailure: Error | null = null;

  async findAdminByUsername(): Promise<AdminAuthenticationRecord | null> {
    if (this.findFailure !== null) throw this.findFailure;
    return this.user;
  }

  async recordFailedLogin(input: {
    readonly userId: string;
    readonly attemptedAt: Date;
    readonly maximumAttempts: number;
    readonly lockedUntil: Date;
  }): Promise<void> {
    this.failedUserIds.push(input.userId);
  }

  async createSession(input: CreateAdminSessionInput): Promise<void> {
    const failure = this.createFailures.shift();
    if (failure !== undefined) throw failure;
    this.createdSessions.push(input);
  }

  async findIdentityBySessionId(): Promise<AdminIdentity | null> {
    return this.identity;
  }

  async revokeSession(sessionId: string): Promise<void> {
    this.revokedSessionIds.push(sessionId);
  }
}

function service(
  repository = new FakeAuthenticationRepository(),
  verify: (password: string, hash: string | null) => Promise<boolean> = async (
    password,
  ) => password === "correct-password",
  tokens: string[] = [TOKEN],
) {
  return {
    repository,
    service: new AdminAuthenticationService(repository, {
      now: () => NOW,
      token: () => tokens.shift() ?? TOKEN,
      verifyPassword: verify,
    }),
  };
}

describe("login input validation", () => {
  it("normalizes surrounding whitespace and casing without changing internal characters", () => {
    assert.deepEqual(
      parseLoginInput({ username: "  Quản Trị  ", password: "secret" }),
      { username: "quản trị", password: "secret" },
    );
    assert.equal(normalizeLoginUsername(" ADMIN "), "admin");
    assert.equal(
      normalizeLoginUsername(" ADMIN "),
      normalizeLoginUsername("admin"),
    );
  });

  for (const [name, input] of [
    ["missing username", { password: "secret" }],
    ["missing password", { username: "admin" }],
    ["blank username", { username: "   ", password: "secret" }],
    ["unknown field", { username: "admin", password: "secret", extra: true }],
  ] as const) {
    it(`rejects ${name} without including the password in validation details`, () => {
      assert.throws(
        () => parseLoginInput(input),
        (error: unknown) => {
          assert.ok(error instanceof ValidationError);
          assert.equal(JSON.stringify(error.details).includes("secret"), false);
          return true;
        },
      );
    });
  }
});

describe("AdminAuthenticationService", () => {
  it("uses the same generic 401 for an unknown user and a wrong password", async () => {
    const unknown = service();
    unknown.repository.user = null;
    await assert.rejects(
      unknown.service.authenticate({ username: "missing", password: "wrong" }),
      UnauthorizedError,
    );

    const wrong = service();
    await assert.rejects(
      wrong.service.authenticate({ username: "admin", password: "wrong" }),
      UnauthorizedError,
    );
    assert.deepEqual(wrong.repository.failedUserIds, [admin().id]);
  });

  it("returns 403 errors only after valid credentials reveal disabled or locked state", async () => {
    const disabled = service();
    disabled.repository.user = admin({ isActive: false });
    await assert.rejects(
      disabled.service.authenticate({ username: "admin", password: "correct-password" }),
      AccountDisabledError,
    );

    const locked = service();
    locked.repository.user = admin({
      lockedUntil: new Date("2026-08-03T08:15:00.000Z"),
    });
    await assert.rejects(
      locked.service.authenticate({ username: "admin", password: "correct-password" }),
      AccountLockedError,
    );
  });

  it("creates an eight-hour hashed server session and returns a safe DTO", async () => {
    const context = service();
    const result = await context.service.authenticate({
      username: " ADMIN ",
      password: "correct-password",
    });

    assert.equal(result.token, TOKEN);
    assert.equal(result.expiresAt.toISOString(), "2026-08-03T16:00:00.000Z");
    assert.deepEqual(result.identity, {
      id: admin().id,
      username: "admin",
      fullName: "Test Admin",
      email: "admin@test.invalid",
      role: "ADMIN",
    });
    assert.equal(JSON.stringify(result.identity).includes("stored-hash"), false);
    assert.equal(context.repository.createdSessions.length, 1);
    assert.equal(context.repository.createdSessions[0]?.sessionId.length, 64);
    assert.notEqual(context.repository.createdSessions[0]?.sessionId, TOKEN);
  });

  it("retries one generated session collision and then succeeds", async () => {
    const repository = new FakeAuthenticationRepository();
    repository.createFailures.push(new ConflictError());
    const context = service(repository, undefined, ["b".repeat(43), TOKEN]);

    const result = await context.service.authenticate({
      username: "admin",
      password: "correct-password",
    });

    assert.equal(result.token, TOKEN);
    assert.equal(repository.createdSessions.length, 1);
  });

  it("maps password verifier failures without exposing credential material", async () => {
    const context = service(
      undefined,
      async () => {
        throw new Error("native verifier failure");
      },
    );
    await assert.rejects(
      context.service.authenticate({ username: "admin", password: "secret" }),
      InternalServerError,
    );
  });

  it("preserves a safe repository error without exposing its database cause", async () => {
    const context = service();
    context.repository.findFailure = new DatabaseError({
      cause: new Error("raw database details"),
    });

    await assert.rejects(
      context.service.authenticate({ username: "admin", password: "secret" }),
      (error: unknown) => {
        assert.ok(error instanceof DatabaseError);
        assert.equal(error.message.includes("raw database details"), false);
        return true;
      },
    );
  });

  it("treats missing or expired sessions as unauthenticated and revokes idempotently", async () => {
    const context = service();
    context.repository.identity = null;
    assert.equal(await context.service.getIdentity("expired-token"), null);
    assert.equal(await context.service.getIdentity(undefined), null);

    await context.service.revoke("old-token");
    await context.service.revoke("old-token");
    assert.equal(context.repository.revokedSessionIds.length, 2);
    assert.equal(context.repository.revokedSessionIds[0]?.length, 64);
  });
});
