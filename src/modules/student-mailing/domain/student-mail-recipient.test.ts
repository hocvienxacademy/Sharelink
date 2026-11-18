import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canSendInvoice,
  filterRecipients,
  sortRecipients,
  type StudentMailRecipient,
} from "./student-mail-recipient";

const recipient = (
  id: string,
  fullName: string,
  classCode: string,
  stage: StudentMailRecipient["stage"],
): StudentMailRecipient => ({
  id,
  fullName,
  classCode,
  email: `${id}@example.com`,
  phone: "",
  stage,
});

const items = [
  recipient("1", "Trần Bình", "DA24B", "NOTICE_SENT"),
  recipient("2", "Lê An", "DA24A", "NOT_SENT"),
  recipient("3", "Phạm Chi", "DA24A", "INVOICE_SENT"),
];

describe("student mail recipients", () => {
  it("only allows the invoice after the notice has been sent", () => {
    assert.deepEqual(items.map(canSendInvoice), [true, false, true]);
  });

  it("combines filter rules with AND / OR and a free-text search", () => {
    const rules = [
      { id: "a", field: "classCode", operator: "equals", value: "da24a" },
      { id: "b", field: "stage", operator: "is", value: "NOTICE_SENT" },
    ] as const;
    assert.deepEqual(
      filterRecipients(items, rules, "and").map((item) => item.id),
      [],
    );
    assert.deepEqual(
      filterRecipients(items, rules, "or").map((item) => item.id),
      ["1", "2", "3"],
    );
    assert.deepEqual(
      filterRecipients(items, [], "and", "chi").map((item) => item.id),
      ["3"],
    );
  });

  it("ignores text rules whose value is still empty", () => {
    assert.equal(
      filterRecipients(
        items,
        [{ id: "a", field: "fullName", operator: "contains", value: " " }],
        "and",
      ).length,
      3,
    );
  });

  it("sorts by several rules in priority order", () => {
    const sorted = sortRecipients(items, [
      { id: "a", field: "classCode", direction: "asc" },
      { id: "b", field: "stage", direction: "desc" },
    ]);
    assert.deepEqual(
      sorted.map((item) => item.id),
      ["3", "2", "1"],
    );
  });
});
