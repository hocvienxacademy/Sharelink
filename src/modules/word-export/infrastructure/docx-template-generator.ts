import fs from "node:fs";
import path from "node:path";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import type { WordDocumentGenerator } from "../application/word-export-service";
import type {
  ApplicationWordExportRecord,
  ApplicationWordExportRelative,
} from "../application/word-export-repository";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "src",
  "modules",
  "word-export",
  "templates",
  "phieu-du-tuyen-v1.docx",
);

function value(
  input: string | number | null,
  emptyValue = "",
): string {
  return input === null ? emptyValue : String(input);
}

function formatDate(input: string | null, emptyValue = ""): string {
  if (input === null) return emptyValue;
  const [year, month, day] = input.split("-");
  return `${day}/${month}/${year}`;
}

function datePart(
  input: string | null,
  part: "day" | "month" | "year",
): string {
  if (input === null) return part === "year" ? "........" : "......";
  const [year, month, day] = input.split("-");
  return { day, month, year }[part] ?? "……";
}

function relativeAt(
  relatives: readonly ApplicationWordExportRelative[],
  position: number,
): ApplicationWordExportRelative | undefined {
  return relatives.find((relative) => relative.position === position);
}

function genderLabel(gender: ApplicationWordExportRecord["gender"]): string {
  if (gender === "MALE") return "Nam";
  if (gender === "FEMALE") return "Nữ";
  if (gender === "OTHER") return "Khác";
  return "";
}

function qualificationLabel(
  qualification: ApplicationWordExportRecord["entryQualification"],
): string {
  if (qualification === "CD") return "CĐ";
  if (qualification === "DH") return "ĐH";
  return qualification ?? "";
}

function templateData(record: ApplicationWordExportRecord) {
  const relative1 = relativeAt(record.relatives, 1);
  const relative2 = relativeAt(record.relatives, 2);
  const entryQualification = qualificationLabel(record.entryQualification);
  return {
    major_name: value(record.majorName, "........................................"),
    entry_qualification_line: entryQualification === ""
      ? "Đối tượng: từ (THPT/TC/CĐ/ĐH).....................học lên Đại học"
      : `Đối tượng: từ (${entryQualification}) học lên Đại học`,
    full_name: value(record.fullName),
    gender: genderLabel(record.gender),
    date_of_birth: formatDate(record.dateOfBirth, "...../...../....."),
    place_of_birth: value(record.placeOfBirth),
    ethnicity: value(record.ethnicity),
    religion: value(record.religion),
    nationality: value(record.nationality),
    citizen_id: value(record.citizenId),
    citizen_id_issued_date: formatDate(record.citizenIdIssuedDate),
    citizen_id_issued_place: value(record.citizenIdIssuedPlace),
    permanent_address: value(record.permanentAddress),
    workplace: value(record.workplace),
    phone: value(record.phone),
    email: value(record.email),
    contact_address: value(record.contactAddress),
    admission_diploma: value(record.admissionDiploma),
    graduate_major: value(record.graduateMajor),
    graduation_year: value(record.graduationYear),
    high_school_name: value(record.highSchoolName),
    high_school_ward: value(record.highSchoolWard),
    high_school_province: value(record.highSchoolProvince),
    declaration_place: value(record.declarationPlace, ".............."),
    declaration_day: datePart(record.declarationDate, "day"),
    declaration_month: datePart(record.declarationDate, "month"),
    declaration_year: datePart(record.declarationDate, "year"),
    relative_1_full_name: value(relative1?.fullName ?? null),
    relative_1_relationship: value(relative1?.relationship ?? null),
    relative_1_occupation: value(relative1?.occupation ?? null),
    relative_1_phone: value(relative1?.phone ?? null),
    relative_1_address: value(relative1?.address ?? null),
    relative_2_full_name: value(relative2?.fullName ?? null),
    relative_2_relationship: value(relative2?.relationship ?? null),
    relative_2_occupation: value(relative2?.occupation ?? null),
    relative_2_phone: value(relative2?.phone ?? null),
    relative_2_address: value(relative2?.address ?? null),
  };
}

function scrubMetadata(zip: PizZip): void {
  const coreFile = zip.file("docProps/core.xml");
  if (coreFile !== null) {
    zip.file(
      "docProps/core.xml",
      coreFile
        .asText()
        .replace(/<dc:creator>[\s\S]*?<\/dc:creator>/, "<dc:creator></dc:creator>")
        .replace(/<cp:lastModifiedBy>[\s\S]*?<\/cp:lastModifiedBy>/, "<cp:lastModifiedBy></cp:lastModifiedBy>"),
    );
  }
  for (const name of Object.keys(zip.files)) {
    if (!name.startsWith("word/") || !name.endsWith(".xml")) continue;
    const file = zip.file(name);
    if (file !== null) {
      zip.file(name, file.asText().replace(/\s+w:rsid(?:R|RPr|RDefault|P|Del|Sect)="[^"]*"/g, ""));
    }
  }
}

const FIELD_NATURAL_LENGTHS: Readonly<Record<string, number>> = {
  major_name: 30,
  full_name: 28,
  gender: 8,
  place_of_birth: 28,
  ethnicity: 12,
  religion: 12,
  nationality: 12,
  citizen_id_issued_place: 18,
  permanent_address: 55,
  workplace: 45,
  email: 40,
  contact_address: 55,
  graduate_major: 28,
  high_school_name: 40,
  high_school_ward: 25,
  high_school_province: 18,
  declaration_place: 15,
  relative_1_full_name: 28,
  relative_1_relationship: 12,
  relative_1_occupation: 22,
  relative_1_address: 45,
  relative_2_full_name: 28,
  relative_2_relationship: 12,
  relative_2_occupation: 22,
  relative_2_address: 45,
};

function fitLongValues(zip: PizZip, data: Record<string, string>): void {
  const file = zip.file("word/document.xml");
  if (file === null) return;
  let xml = file.asText();
  for (const [tag, maximumNaturalLength] of Object.entries(FIELD_NATURAL_LENGTHS)) {
    const text = data[tag] ?? "";
    if (text.length <= maximumNaturalLength) continue;
    const scale = Math.max(
      20,
      Math.floor((maximumNaturalLength / text.length) * 100),
    );
    const runPattern = new RegExp(
      `(<w:r\\b(?:(?!<\\/w:r>)[\\s\\S])*?<w:t[^>]*>\\{${tag}\\}<\\/w:t>(?:(?!<\\/w:r>)[\\s\\S])*?<\\/w:r>)`,
    );
    xml = xml.replace(runPattern, (run) =>
      run.replace(
        "</w:rPr>",
        `<w:w w:val="${scale}"/></w:rPr>`,
      ),
    );
  }
  zip.file("word/document.xml", xml);
}

const FIELD_TAB_STOPS = [
  { paragraphId: "4CBB0D89", fields: [["full_name", 6000], ["gender", 9072]] },
  { paragraphId: "3F030D80", fields: [["date_of_birth", 3600], ["place_of_birth", 9072]] },
  { paragraphId: "7329B1FA", fields: [["ethnicity", 3000], ["religion", 6200], ["nationality", 9072]] },
  { paragraphId: "219DB2CB", fields: [["citizen_id", 3200], ["citizen_id_issued_date", 6200], ["citizen_id_issued_place", 9072]] },
  { paragraphId: "39E0C9AC", fields: [["permanent_address", 9072]] },
  { paragraphId: "100F1AFA", fields: [["workplace", 9072]] },
  { paragraphId: "2E8A9302", fields: [["phone", 3600], ["email", 9072]] },
  { paragraphId: "15367152", fields: [["contact_address", 9072]] },
  { paragraphId: "52AACFF1", fields: [["admission_diploma", 9072]] },
  { paragraphId: "7DF82AFC", fields: [["graduate_major", 5800], ["graduation_year", 9072]] },
  { paragraphId: "34960EF7", fields: [["high_school_name", 9072]] },
  { paragraphId: "7BC8F8A9", fields: [["high_school_ward", 5200], ["high_school_province", 9072]] },
  { paragraphId: "4110B539", fields: [["relative_1_full_name", 5670], ["relative_1_relationship", 9072]] },
  { paragraphId: "39051AFB", fields: [["relative_1_occupation", 5103], ["relative_1_phone", 9072]] },
  { paragraphId: "13E8EFC5", fields: [["relative_1_address", 9072]] },
  { paragraphId: "6A431136", fields: [["relative_2_full_name", 5670], ["relative_2_relationship", 9072]] },
  { paragraphId: "29F82ABF", fields: [["relative_2_occupation", 5103], ["relative_2_phone", 9072]] },
  { paragraphId: "308CAAF8", fields: [["relative_2_address", 9072]] },
] as const;

function hasInformation(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value);
}

function updateFieldDotLeaders(
  zip: PizZip,
  data: Record<string, string>,
): void {
  const file = zip.file("word/document.xml");
  if (file === null) return;
  let xml = file.asText();
  for (const { paragraphId, fields } of FIELD_TAB_STOPS) {
    const paragraphPattern = new RegExp(
      `<w:p\\b[^>]*w14:paraId="${paragraphId}"[^>]*>[\\s\\S]*?<\\/w:p>`,
    );
    xml = xml.replace(paragraphPattern, (paragraph) => {
      let updatedParagraph = paragraph;
      for (const [tag, position] of fields) {
        const leader = hasInformation(data[tag] ?? "") ? "none" : "dot";
        const tabStopPattern = new RegExp(
          `<w:tab\\b(?=[^>]*w:pos="${position}")[^>]*/>`,
        );
        updatedParagraph = updatedParagraph.replace(tabStopPattern, (tabStop) =>
          tabStop.replace(/w:leader="[^"]*"/, `w:leader="${leader}"`),
        );
      }
      return updatedParagraph;
    });
  }
  zip.file("word/document.xml", xml);
}

function useReservedContinuationLines(
  zip: PizZip,
  data: Record<string, string>,
): void {
  const file = zip.file("word/document.xml");
  if (file === null) return;
  let xml = file.asText();
  const reservedLines = [
    { tag: "permanent_address", paragraphId: "7FA5A099", threshold: 35 },
    { tag: "contact_address", paragraphId: "64A6161A", threshold: 35 },
  ] as const;
  for (const { tag, paragraphId, threshold } of reservedLines) {
    if ((data[tag] ?? "").length <= threshold) continue;
    xml = xml.replace(
      new RegExp(`<w:p\\b[^>]*w14:paraId="${paragraphId}"[^>]*>[\\s\\S]*?<\\/w:p>`),
      "",
    );
  }
  zip.file("word/document.xml", xml);
}

function compactOnlyExceptionallyDenseRecords(
  zip: PizZip,
  data: Record<string, string>,
): void {
  const excessWidth = Object.entries(FIELD_NATURAL_LENGTHS).reduce(
    (total, [tag, maximumNaturalLength]) =>
      total + Math.max(0, (data[tag] ?? "").length - maximumNaturalLength),
    0,
  );
  if (excessWidth <= 100) return;

  const file = zip.file("word/document.xml");
  if (file === null) return;
  zip.file(
    "word/document.xml",
    file.asText().replace(
      /<w:spacing w:before="40" w:after="40" w:line="288" w:lineRule="auto"\/>/g,
      '<w:spacing w:line="190" w:lineRule="exact"/>',
    ),
  );
}

export class DocxTemplateGenerator implements WordDocumentGenerator {
  constructor(private readonly templatePath = TEMPLATE_PATH) {}

  generate(record: ApplicationWordExportRecord): Uint8Array {
    const zip = new PizZip(fs.readFileSync(this.templatePath));
    const data = templateData(record);
    fitLongValues(zip, data);
    updateFieldDotLeaders(zip, data);
    useReservedContinuationLines(zip, data);
    compactOnlyExceptionallyDenseRecords(zip, data);
    const document = new Docxtemplater(zip, {
      linebreaks: true,
      paragraphLoop: true,
      nullGetter: () => "",
    });
    document.render(data);
    const renderedZip = document.getZip();
    scrubMetadata(renderedZip);
    return renderedZip.generate({
      type: "uint8array",
      compression: "DEFLATE",
    });
  }
}
