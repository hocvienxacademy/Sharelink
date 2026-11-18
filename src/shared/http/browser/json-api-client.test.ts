import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { ApiRequestError, requestJson } from "./json-api-client";

const respond =
  (status: number, body: unknown): typeof fetch =>
  async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
    });

const rejectsWith = (
  promise: Promise<unknown>,
  expected: Partial<Pick<ApiRequestError, "kind" | "status" | "message">>,
) =>
  assert.rejects(promise, (error) => {
    assert.ok(error instanceof ApiRequestError);
    for (const [key, value] of Object.entries(expected)) {
      assert.equal(error[key as keyof typeof expected], value);
    }
    return true;
  });

describe("requestJson", () => {
  it("returns the data of a success envelope and validates it with a schema", async () => {
    const fetchImplementation = respond(200, {
      success: true,
      data: { id: 1 },
    });
    assert.deepEqual(
      await requestJson("/x", "GET", undefined, { fetchImplementation }),
      { id: 1 },
    );
    await rejectsWith(
      requestJson("/x", "GET", undefined, {
        fetchImplementation,
        schema: z.object({ id: z.string() }),
      }),
      { kind: "server", message: "Phản hồi máy chủ không hợp lệ." },
    );
  });

  it("sends JSON only when a body is given", async () => {
    let init: RequestInit | undefined;
    await requestJson(
      "/x",
      "POST",
      { a: 1 },
      {
        fetchImplementation: async (_path, requestInit) => {
          init = requestInit;
          return new Response(JSON.stringify({ success: true, data: null }));
        },
      },
    );
    assert.equal(init?.body, '{"a":1}');
    assert.equal(
      new Headers(init?.headers).get("Content-Type"),
      "application/json",
    );
  });

  it("maps HTTP failures to error kinds and keeps the safe server message and issues", async () => {
    const issue = { path: ["email"], code: "invalid", message: "Email sai" };
    await assert.rejects(
      requestJson(
        "/x",
        "POST",
        {},
        {
          fetchImplementation: respond(422, {
            success: false,
            error: {
              code: "VALIDATION",
              message: "Dữ liệu sai",
              details: [issue],
            },
          }),
        },
      ),
      (error) =>
        error instanceof ApiRequestError &&
        error.kind === "validation" &&
        error.message === "Dữ liệu sai" &&
        error.issues[0]?.message === "Email sai",
    );
    await rejectsWith(
      requestJson("/x", "GET", undefined, {
        fetchImplementation: respond(409, ""),
      }),
      { kind: "conflict", message: "Không thể thực hiện thao tác." },
    );
    await rejectsWith(
      requestJson("/x", "GET", undefined, {
        fetchImplementation: respond(403, ""),
      }),
      { kind: "unauthorized", status: 403 },
    );
  });

  it("distinguishes bad requests from missing resources", async () => {
    await rejectsWith(
      requestJson("/x", "GET", undefined, {
        fetchImplementation: respond(400, ""),
      }),
      { kind: "bad-request" },
    );
    await rejectsWith(
      requestJson("/x", "GET", undefined, {
        fetchImplementation: respond(404, ""),
      }),
      { kind: "not-found" },
    );
  });

  it("forwards the abort signal to fetch", async () => {
    const controller = new AbortController();
    let received: AbortSignal | null | undefined;
    await requestJson("/x", "GET", undefined, {
      signal: controller.signal,
      fetchImplementation: async (_path, init) => {
        received = init?.signal;
        return new Response(JSON.stringify({ success: true, data: null }));
      },
    });
    assert.equal(received, controller.signal);
  });

  it("reports network failures", async () => {
    await rejectsWith(
      requestJson("/x", "GET", undefined, {
        fetchImplementation: async () => {
          throw new TypeError("offline");
        },
      }),
      { kind: "network", status: 0 },
    );
  });
});
