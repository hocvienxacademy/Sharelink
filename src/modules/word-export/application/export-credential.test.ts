import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHash } from "node:crypto";
import { ExportCredentialFactory, parseExportCode } from "./export-credential";

describe("ExportCredentialFactory", () => {
  it("returns the public code and only its SHA-256 digest for persistence", () => {
    const factory = new ExportCredentialFactory(() =>
      Buffer.from("0123456789abcdef0123456789abcdef", "hex"),
    );

    const credential = factory.create();

    assert.equal(credential.code, "ASNFZ4mrze8BI0VniavN7w");
    assert.equal(
      credential.digest,
      createHash("sha256").update(credential.code).digest("hex"),
    );
    assert.equal(credential.digest.includes(credential.code), false);
  });

  it("rejects malformed or oversized download codes", () => {
    assert.throws(() => parseExportCode("short"));
    assert.throws(() => parseExportCode("a".repeat(129)));
    assert.equal(
      parseExportCode("ASNFZ4mrze8BI0VniavN7w"),
      "ASNFZ4mrze8BI0VniavN7w",
    );
  });
});
