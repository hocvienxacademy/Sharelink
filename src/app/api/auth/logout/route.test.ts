import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { DatabaseError } from "@/shared/errors";
import { createLogoutHandler } from "./route";

function request(options: { cookie?: string; origin?: string } = {}): NextRequest {
  return new NextRequest("http://localhost/api/auth/logout", {
    method: "POST",
    headers: {
      origin: options.origin ?? "http://localhost",
      ...(options.cookie === undefined
        ? {}
        : { cookie: `sls_admin_session=${options.cookie}` }),
    },
  });
}

describe("POST /api/auth/logout", () => {
  it("rejects cross-origin logout before touching the session", async () => {
    let revokeCalls = 0;
    const response = await createLogoutHandler({
      revoke: async () => {
        revokeCalls += 1;
      },
    })(request({ origin: "https://attacker.invalid", cookie: "old-token" }));
    assert.equal(response.status, 400);
    assert.equal(revokeCalls, 0);
  });

  it("revokes the server session and clears the cookie idempotently", async () => {
    const tokens: Array<string | undefined> = [];
    const handler = createLogoutHandler({
      revoke: async (token) => {
        tokens.push(token);
      },
    });

    const first = await handler(request({ cookie: "old-token" }));
    const second = await handler(request());
    const cookie = first.headers.get("set-cookie") ?? "";

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.deepEqual(tokens, ["old-token", undefined]);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=lax/i);
    assert.match(cookie, /Max-Age=0/i);
    assert.match(cookie, /Path=\//i);
  });

  it("sanitizes a revoke failure while still clearing the browser cookie", async () => {
    const response = await createLogoutHandler({
      revoke: async () => {
        throw new DatabaseError({ cause: new Error("raw prisma failure") });
      },
    })(request({ cookie: "old-token" }));
    const body = await response.text();
    assert.equal(response.status, 500);
    assert.equal(body.includes("prisma"), false);
    assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=0/i);
  });
});
