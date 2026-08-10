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

function value(input: string | number | null): string {
  return input === null ? "" : String(input);
}

function formatDate(input: string | null): string {
  if (input === null) return "";
  const [year, month, day] = input.split("-");
  return `${day}/${month}/${year}`;
}

function datePart(
  input: string | null,
  part: "day" | "month" | "year",
): string {
  if (input === null) return "……";
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

function templateData(record: ApplicationWordExportRecord) {
  const relative1 = relativeAt(record.relatives, 1);
  const relative2 = relativeAt(record.relatives, 2);
  return {
    major_name: value(record.majorName),
    entry_qualification: value(record.entryQualification),
    full_name: value(record.fullName),
    gender: genderLabel(record.gender),
    date_of_birth: formatDate(record.dateOfBirth),
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
    declaration_place: value(record.declarationPlace),
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

function fitLongValues(zip: PizZip, data: Record<string, string>): void {
  const file = zip.file("word/document.xml");
  if (file === null) return;
  let xml = file.asText();
  for (const [tag, text] of Object.entries(data)) {
    if (text.length <= 24) continue;
    const size = text.length > 45 ? 12 : 14;
    const runPattern = new RegExp(`(<w:r\\b(?:(?!<\\/w:r>)[\\s\\S])*?<w:t[^>]*>\\{${tag}\\}<\\/w:t>(?:(?!<\\/w:r>)[\\s\\S])*?<\\/w:r>)`);
    xml = xml.replace(runPattern, (run) => run.replace(/<w:sz w:val="\d+"\/><w:szCs w:val="\d+"\/>/, `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`));
  }
  zip.file("word/document.xml", xml);
}

export class DocxTemplateGenerator implements WordDocumentGenerator {
  constructor(private readonly templatePath = TEMPLATE_PATH) {}

  generate(record: ApplicationWordExportRecord): Uint8Array {
    const zip = new PizZip(fs.readFileSync(this.templatePath));
    const data = templateData(record);
    fitLongValues(zip, data);
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
