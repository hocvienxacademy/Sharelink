import type { StudentMailRecipient } from "../domain/student-mail-recipient";

type RosterColumn = "fullName" | "classCode" | "email" | "phone";

export interface StudentRosterParseResult {
  readonly recipients: readonly StudentMailRecipient[];
  readonly skippedRowCount: number;
  readonly missingColumns: readonly RosterColumn[];
}

const headerAliases: Readonly<Record<RosterColumn, readonly string[]>> = {
  fullName: [
    "ten sinh vien",
    "ho ten",
    "ho va ten",
    "ho ten sinh vien",
    "ten",
    "sinh vien",
    "name",
    "full name",
    "fullname",
  ],
  classCode: [
    "ma lop",
    "lop",
    "ma lop hoc",
    "class",
    "class code",
    "classcode",
  ],
  email: ["email", "e-mail", "mail", "dia chi email", "thu dien tu"],
  phone: [
    "so dien thoai",
    "dien thoai",
    "sdt",
    "so dt",
    "phone",
    "phone number",
    "mobile",
  ],
};

export function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectDelimiter(headerLine: string): string {
  const candidates = [",", ";", "\t"];
  return candidates.reduce(
    (best, candidate) =>
      headerLine.split(candidate).length > headerLine.split(best).length
        ? candidate
        : best,
    ",",
  );
}

/** RFC 4180-style CSV reader that supports quoted fields, escaped quotes and CRLF. */
export function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"' && field === "") quoted = true;
    else if (character === delimiter) {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

/** Excel stores "0901234567" typed into a number cell as 901234567. */
function restoreLeadingZero(phone: string): string {
  return /^[1-9]\d{8}$/.test(phone) ? `0${phone}` : phone;
}

export function parseStudentRosterCsv(text: string): StudentRosterParseResult {
  const content = text.replace(/^\uFEFF/, "");
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  return parseStudentRosterRows(parseCsv(content, detectDelimiter(firstLine)));
}

/** Maps a sheet whose first row is the header (CSV or Excel) to mail recipients. */
export function parseStudentRosterRows(
  rows: readonly (readonly string[])[],
): StudentRosterParseResult {
  const nonEmptyRows = rows.filter((cells) =>
    cells.some((cell) => cell.trim() !== ""),
  );
  const [header = [], ...dataRows] = nonEmptyRows;
  const normalizedHeader = header.map(normalizeHeader);
  const columnIndex = Object.fromEntries(
    (Object.keys(headerAliases) as RosterColumn[]).map((column) => [
      column,
      normalizedHeader.findIndex((cell) =>
        headerAliases[column].includes(cell),
      ),
    ]),
  ) as Record<RosterColumn, number>;
  const missingColumns = (Object.keys(columnIndex) as RosterColumn[]).filter(
    (column) => columnIndex[column] < 0,
  );
  const read = (cells: readonly string[], column: RosterColumn) =>
    columnIndex[column] < 0 ? "" : (cells[columnIndex[column]] ?? "").trim();

  const recipients: StudentMailRecipient[] = [];
  let skippedRowCount = 0;
  dataRows.forEach((cells, index) => {
    const fullName = read(cells, "fullName");
    const email = read(cells, "email");
    if (fullName === "" && email === "") {
      skippedRowCount += 1;
      return;
    }
    recipients.push({
      id: `row-${index + 1}`,
      fullName,
      classCode: read(cells, "classCode"),
      email,
      phone: restoreLeadingZero(read(cells, "phone")),
      stage: "NOT_SENT",
    });
  });
  return { recipients, skippedRowCount, missingColumns };
}
