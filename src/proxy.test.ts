import assert from "node:assert/strict";
import test from "node:test";
import { buildContentSecurityPolicy } from "./proxy";

test("development CSP permits framework dev runtime styles and evaluation", () => {
  const policy = buildContentSecurityPolicy("test-nonce", "development");

  assert.match(policy, /script-src[^;]+'unsafe-eval'/);
  assert.match(policy, /style-src[^;]+'unsafe-inline'/);
  assert.match(policy, /script-src[^;]+'nonce-test-nonce'/);
  assert.doesNotMatch(policy, /style-src[^;]+'nonce-test-nonce'/);
});

test("production CSP keeps inline styles and evaluation disabled", () => {
  const policy = buildContentSecurityPolicy("test-nonce", "production");

  assert.doesNotMatch(policy, /'unsafe-eval'/);
  assert.doesNotMatch(policy, /'unsafe-inline'/);
  assert.match(policy, /style-src 'self' 'nonce-test-nonce'/);
});
