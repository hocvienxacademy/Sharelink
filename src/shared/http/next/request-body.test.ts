import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BadRequestError,
  PayloadTooLargeError,
} from "../../errors/index";
import { readJsonBody } from "./request-body";

test("normal JSON payload is parsed within the byte limit", async () => {
  const result = await readJsonBody(
    new Request("https://app.test", {
      method: "POST",
      body: JSON.stringify({ fullName: "Sinh viên thử nghiệm" }),
    }),
    1024,
  );
  assert.deepEqual(result, { fullName: "Sinh viên thử nghiệm" });
});

test("declared oversized payload is rejected before reading the stream", async () => {
  const request = new Request("https://app.test", {
    method: "POST",
    headers: { "content-length": "2048" },
    body: "{}",
  });
  await assert.rejects(() => readJsonBody(request, 1024), PayloadTooLargeError);
  assert.equal(request.bodyUsed, false);
});

test("streamed oversized payload is rejected without logging its contents", async () => {
  const request = new Request("https://app.test", {
    method: "POST",
    body: JSON.stringify({ value: "x".repeat(2048) }),
  });
  await assert.rejects(() => readJsonBody(request, 1024), PayloadTooLargeError);
});

test("malformed and invalid UTF-8 bodies return a safe bad request", async () => {
  await assert.rejects(
    () =>
      readJsonBody(
        new Request("https://app.test", { method: "POST", body: "{" }),
      ),
    BadRequestError,
  );
  await assert.rejects(
    () =>
      readJsonBody(
        new Request("https://app.test", {
          method: "POST",
          body: new Uint8Array([0xc3, 0x28]),
        }),
      ),
    BadRequestError,
  );
});
