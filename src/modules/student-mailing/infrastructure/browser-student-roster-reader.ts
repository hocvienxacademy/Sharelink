import { readSheet, type CellValue } from "read-excel-file/browser";
import { formatDate } from "@/shared/presentation/format";
import {
  parseStudentRosterCsv,
  parseStudentRosterRows,
  type StudentRosterParseResult,
} from "../application/parse-student-roster";

export const supportedRosterExtensions = [".csv", ".xlsx"] as const;
export type RosterFileExtension = (typeof supportedRosterExtensions)[number];

export function rosterFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot < 0 ? "" : fileName.slice(dot).toLowerCase();
}

export function isSupportedRosterExtension(
  extension: string,
): extension is RosterFileExtension {
  return supportedRosterExtensions.some((item) => item === extension);
}

export function cellToText(value: CellValue | null): string {
  if (value === null) return "";
  // read-excel-file returns date cells as UTC midnight.
  if (value instanceof Date) return formatDate(value);
  return String(value).trim();
}

/** Reads the first worksheet of an .xlsx file or a UTF-8 CSV file in the browser. */
export async function readStudentRosterFile(
  file: File,
  extension: RosterFileExtension,
): Promise<StudentRosterParseResult> {
  if (extension === ".csv") return parseStudentRosterCsv(await file.text());
  const rows = await readSheet(file);
  return parseStudentRosterRows(rows.map((row) => row.map(cellToText)));
}
