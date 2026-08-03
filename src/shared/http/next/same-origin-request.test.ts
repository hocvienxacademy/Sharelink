import assert from "node:assert/strict";
import test from "node:test";
import { isSameOriginRequest } from "./same-origin-request";

test("same-origin request accepts browser same-origin metadata", () => {
  const request = new Request("https://internal.example/api/auth/login", {
    headers: {
      origin: "https://public.example",
      "sec-fetch-site": "same-origin",
    },
  });

  assert.equal(isSameOriginRequest(request), true);
});

test("same-origin request rejects cross-site metadata and mismatched origins", () => {
  assert.equal(
    isSameOriginRequest(
      new Request("https://app.example/api/auth/logout", {
        headers: { "sec-fetch-site": "cross-site" },
      }),
    ),
    false,
  );
  assert.equal(
    isSameOriginRequest(
      new Request("https://app.example/api/auth/logout", {
        headers: { origin: "https://evil.example" },
      }),
    ),
    false,
  );
});
