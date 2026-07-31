import assert from "node:assert/strict";
import { test } from "node:test";
import {
  RateLimitUnavailableError,
  TooManyRequestsError,
} from "../errors/index";
import { UpstashRestRateLimiter } from "../infrastructure/rate-limit/upstash-rest-rate-limiter";
import {
  DefaultRateLimitGuard,
  createRateLimitKey,
  trustedClientIdentity,
  type RateLimiter,
  type RateLimitInput,
} from "./index";

const TOKEN = "50000000-0000-4000-8000-000000000001";
const SECRET = "test-only-secret-with-at-least-32-characters";

function limiterWithDecision(
  decision: { allowed: boolean; retryAfterSeconds: number },
  inputs: RateLimitInput[] = [],
): RateLimiter {
  return {
    async consume(input) {
      inputs.push(input);
      return decision;
    },
  };
}

test("requests below and at the configured limit are allowed", async () => {
  for (const count of [1, 5]) {
    const limiter = new UpstashRestRateLimiter({
      url: "https://redis.test",
      token: "credential",
      timeoutMs: 100,
      fetchImplementation: async () =>
        Response.json({ result: [count, 10_000] }),
    });
    const decision = await limiter.consume({
      key: "test-key",
      limit: 5,
      windowMs: 10_000,
    });
    assert.equal(decision.allowed, true);
  }
});

test("a request above the limit is rejected with a retry interval", async () => {
  const guard = new DefaultRateLimitGuard(
    limiterWithDecision({ allowed: false, retryAfterSeconds: 9 }),
    SECRET,
    {},
  );
  await assert.rejects(
    () =>
      guard.enforce({
        endpoint: "submit",
        request: new Request("https://app.test"),
        token: TOKEN,
      }),
    (error: unknown) =>
      error instanceof TooManyRequestsError &&
      error.retryAfterSeconds === 9,
  );
});

test("raw tokens never appear in Redis keys and endpoints use separate buckets", async () => {
  const inputs: RateLimitInput[] = [];
  const guard = new DefaultRateLimitGuard(
    limiterWithDecision({ allowed: true, retryAfterSeconds: 1 }, inputs),
    SECRET,
    {},
  );
  const request = new Request("https://app.test");
  await guard.enforce({ endpoint: "create", request, token: TOKEN });
  await guard.enforce({ endpoint: "submit", request, token: TOKEN });
  assert.equal(inputs.length, 2);
  assert.notEqual(inputs[0]?.key, inputs[1]?.key);
  assert.equal(inputs.some((input) => input.key.includes(TOKEN)), false);
});

test("context fails open while state-changing endpoints fail closed", async () => {
  const unavailable: RateLimiter = {
    async consume() {
      throw new Error("simulated unavailable");
    },
  };
  const guard = new DefaultRateLimitGuard(unavailable, SECRET, {});
  await guard.enforce({
    endpoint: "context",
    request: new Request("https://app.test"),
    token: TOKEN,
  });
  await assert.rejects(
    () =>
      guard.enforce({
        endpoint: "create",
        request: new Request("https://app.test"),
        token: TOKEN,
      }),
    RateLimitUnavailableError,
  );
});

test("Redis timeout is bounded and follows endpoint failure policy", async () => {
  const limiter = new UpstashRestRateLimiter({
    url: "https://redis.test",
    token: "credential",
    timeoutMs: 5,
    fetchImplementation: async (_input, init) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      if (init?.signal?.aborted) {
        throw init.signal.reason;
      }
      throw new Error("Expected the Redis request to time out.");
    },
  });
  const guard = new DefaultRateLimitGuard(limiter, SECRET, {});
  await assert.rejects(
    () =>
      guard.enforce({
        endpoint: "submit",
        request: new Request("https://app.test"),
        token: TOKEN,
      }),
    RateLimitUnavailableError,
  );
});

test("trusted proxy parsing accepts only a configured valid address header", () => {
  const request = new Request("https://app.test", {
    headers: {
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      "x-platform-client-ip": "198.51.100.7",
    },
  });
  assert.equal(trustedClientIdentity(request, {}), "unknown");
  assert.equal(
    trustedClientIdentity(request, {
      TRUSTED_PROXY_IP_HEADER: "x-platform-client-ip",
    }),
    "198.51.100.7",
  );
  assert.equal(
    trustedClientIdentity(request, {
      TRUSTED_PROXY_IP_HEADER: "x-forwarded-for",
    }),
    "203.0.113.10",
  );
});

test("invalid client headers are not admitted to rate-limit keys", () => {
  const request = new Request("https://app.test", {
    headers: { "x-platform-client-ip": "token-or-untrusted-value" },
  });
  assert.equal(
    trustedClientIdentity(request, {
      TRUSTED_PROXY_IP_HEADER: "x-platform-client-ip",
    }),
    "unknown",
  );
  const key = createRateLimitKey({
    endpoint: "context",
    token: TOKEN,
    clientIdentity: "unknown",
    secret: SECRET,
  });
  assert.equal(key.includes(TOKEN), false);
});

test("rate limiter does not write token or full IP to console", async () => {
  const messages: string[] = [];
  const originalError = console.error;
  console.error = (...values: unknown[]) => messages.push(values.join(" "));
  try {
    const guard = new DefaultRateLimitGuard(
      limiterWithDecision({ allowed: true, retryAfterSeconds: 1 }),
      SECRET,
      { TRUSTED_PROXY_IP_HEADER: "x-client-ip" },
    );
    await guard.enforce({
      endpoint: "update",
      request: new Request("https://app.test", {
        headers: { "x-client-ip": "203.0.113.50" },
      }),
      token: TOKEN,
    });
  } finally {
    console.error = originalError;
  }
  assert.equal(messages.join("\n").includes(TOKEN), false);
  assert.equal(messages.join("\n").includes("203.0.113.50"), false);
});
