import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCsv, parseStudentRosterCsv } from "./parse-student-roster";

describe("parseStudentRosterCsv", () => {
  it("maps Vietnamese headers regardless of accents, order and delimiter", () => {
    const result = parseStudentRosterCsv(
      "\uFEFFSĐT;Họ và tên;Mã lớp;Email\r\n0901234567;Nguyễn Văn A;DA24LUAT;a@example.com\r\n",
    );
    assert.deepEqual(result.missingColumns, []);
    assert.equal(result.recipients.length, 1);
    assert.deepEqual(result.recipients[0], {
      id: "row-1",
      fullName: "Nguyễn Văn A",
      classCode: "DA24LUAT",
      email: "a@example.com",
      phone: "0901234567",
      stage: "NOT_SENT",
    });
  });

  it("skips rows without both name and email and reports missing columns", () => {
    const result = parseStudentRosterCsv(
      "ten sinh vien,email\nB,b@example.com\n,\n ,  \nC,\n",
    );
    assert.equal(result.recipients.length, 2);
    assert.deepEqual(result.missingColumns, ["classCode", "phone"]);
  });

  it("reads quoted fields containing delimiters, quotes and newlines", () => {
    assert.deepEqual(parseCsv('a,"b, ""c""\nd",e\n', ","), [
      ["a", 'b, "c"\nd', "e"],
    ]);
  });
});
