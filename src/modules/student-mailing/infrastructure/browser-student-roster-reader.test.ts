import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { readSheet } from "read-excel-file/node";
import { parseStudentRosterRows } from "../application/parse-student-roster";
import {
  cellToText,
  isSupportedRosterExtension,
  rosterFileExtension,
} from "./browser-student-roster-reader";

describe("student roster file reader", () => {
  it("accepts only .xlsx and .csv extensions", () => {
    assert.equal(rosterFileExtension("Danh Sach.XLSX"), ".xlsx");
    assert.equal(rosterFileExtension("khong-co-duoi"), "");
    assert.deepEqual(
      [".xlsx", ".csv", ".xls", ""].map(isSupportedRosterExtension),
      [true, true, false, false],
    );
  });

  it("restores the leading zero of phone numbers stored as Excel numbers", () => {
    const result = parseStudentRosterRows([
      ["Tên sinh viên", "Email", "SĐT"].map(cellToText),
      ["A", "a@example.com", 901000001].map(cellToText),
    ]);
    assert.equal(result.recipients[0]?.phone, "0901000001");
  });

  it("reads the sample workbook shipped in docs/samples", async () => {
    const rows = await readSheet(
      await readFile("docs/samples/danh-sach-sinh-vien-mau.xlsx"),
    );
    const result = parseStudentRosterRows(
      rows.map((row) => row.map(cellToText)),
    );
    assert.equal(result.recipients.length, 10);
    assert.deepEqual(result.missingColumns, []);
    assert.equal(result.recipients[0]?.phone, "0901000001");
  });
});
