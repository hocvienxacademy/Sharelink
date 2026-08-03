import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import { Button } from "./button";

afterEach(cleanup);

describe("Button", () => {
  it("renders a link without claiming native button semantics", async () => {
    const messages: string[] = [];
    const originalError = console.error;
    console.error = (...values: unknown[]) => {
      messages.push(values.map(String).join(" "));
    };

    try {
      render(
        <Button nativeButton={false} render={<a href="/" />}>
          Public page
        </Button>,
      );

      await waitFor(() => {
        assert.equal(
          messages.some((message) => message.includes("expected a native <button>")),
          false,
        );
      });
    } finally {
      console.error = originalError;
    }
  });
});
