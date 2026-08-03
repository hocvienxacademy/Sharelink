import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import {
  AccountLockedError,
  DatabaseError,
  UnauthorizedError,
} from "@/shared/errors";
import { parseLoginInput, type AuthenticatedAdminSession } from "@/modules/auth";
import { createLoginHandler } from "./route";

const session: AuthenticatedAdminSession = {
  token: "session-secret-that-must-not-be-in-the-response",
  expiresAt: new Date("2026-08-03T16:00:00.000Z"),
  identity: {
    id: "10000000-0000-4000-8000-000000000002",
    username: "admin",
    fullName: "Test Admin",
    email: "admin@test.invalid",
    role: "ADMIN",
  },
};

const rateLimitGuard = { enforce: async () => undefined };

function request(body: string): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body,
  });
}

function handler(
  authenticate: (input: unknown) => Promise<AuthenticatedAdminSession>,
  environment: Readonly<Record<string, string | undefined>> = {},
) {
  return createLoginHandler({
    authenticate,
    environment,
    rateLimitGuard,
    revoke: async () => undefined,
  });
}

describe("POST /api/auth/login", () => {
  it("returns 400 for malformed JSON", async () => {
    const response = await handler(async () => session)(request("{"));
    assert.equal(response.status, 400);
  });

  for (const payload of [
    { password: "secret" },
    { username: "admin" },
    { username: "   ", password: "secret" },
    { username: "admin", password: "secret", unknown: true },
  ]) {
    it("returns 422 for an invalid login payload without echoing credentials", async () => {
      const response = await handler(async (input) => {
        parseLoginInput(input);
        throw new Error("unexpected");
      })(request(JSON.stringify(payload)));
      const body = await response.text();
      assert.equal(response.status, 422);
      assert.equal(body.includes("secret"), false);
    });
  }

  it("returns the same safe 401 envelope for invalid credentials", async () => {
    const response = await handler(async () => {
      throw new UnauthorizedError();
    })(request(JSON.stringify({ username: "admin", password: "wrong" })));
    const body = await response.text();
    assert.equal(response.status, 401);
    assert.equal(body.includes("wrong"), false);
  });

  it("returns 403 for a locked account", async () => {
    const response = await handler(async () => {
      throw new AccountLockedError();
    })(request(JSON.stringify({ username: "admin", password: "correct" })));
    assert.equal(response.status, 403);
  });

  it("returns a safe user DTO and hardened development cookie", async () => {
    const response = await handler(async () => session)(
      request(JSON.stringify({ username: "admin", password: "correct" })),
    );
    const body = await response.json();
    const cookie = response.headers.get("set-cookie") ?? "";

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      success: true,
      data: {
        user: {
          id: session.identity.id,
          username: "admin",
          role: "ADMIN",
          displayName: "Test Admin",
        },
      },
    });
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=lax/i);
    assert.match(cookie, /Path=\//i);
    assert.doesNotMatch(cookie, /; Secure/i);
    assert.equal(JSON.stringify(body).includes(session.token), false);
  });

  for (const appEnvironment of ["staging", "production"]) {
    it(`sets Secure on the ${appEnvironment} cookie`, async () => {
      const response = await handler(async () => session, {
        APP_ENV: appEnvironment,
      })(request(JSON.stringify({ username: "admin", password: "correct" })));
      assert.match(response.headers.get("set-cookie") ?? "", /; Secure/i);
    });
  }

  it("maps a database failure to a sanitized 500 response", async () => {
    const response = await handler(async () => {
      throw new DatabaseError({ cause: new Error("raw prisma query failure") });
    })(request(JSON.stringify({ username: "admin", password: "secret" })));
    const body = await response.text();
    assert.equal(response.status, 500);
    assert.equal(body.includes("prisma"), false);
    assert.equal(body.includes("secret"), false);
  });
});
