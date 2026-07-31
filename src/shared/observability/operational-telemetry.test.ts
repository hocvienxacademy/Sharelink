import assert from "node:assert/strict";
import { test } from "node:test";
import { getOperationalTelemetry } from "./operational-telemetry";

test("staging telemetry emits only the allowlisted operational fields", () => {
  const messages: string[] = [];
  const originalInfo = console.info;
  console.info = (value?: unknown) => messages.push(String(value));
  try {
    getOperationalTelemetry({
      APP_ENV: "staging",
      RELEASE_SHA: "abc123",
    }).record("request_count", {
      requestId: "safe-request-id",
      routeClass: "create",
      status: 201,
      durationMs: 12,
    });
  } finally {
    console.info = originalInfo;
  }

  assert.equal(messages.length, 1);
  assert.deepEqual(JSON.parse(messages[0]!), {
    type: "operational_metric",
    metric: "request_count",
    environment: "staging",
    releaseSha: "abc123",
    requestId: "safe-request-id",
    routeClass: "create",
    status: 201,
    durationMs: 12,
  });
});

test("test telemetry is silent", () => {
  const messages: string[] = [];
  const originalInfo = console.info;
  console.info = (value?: unknown) => messages.push(String(value));
  try {
    getOperationalTelemetry({ APP_ENV: "test" }).record("error_count");
  } finally {
    console.info = originalInfo;
  }
  assert.deepEqual(messages, []);
});
