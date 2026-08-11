import fs from "node:fs";
import path from "node:path";
import { WORD_EXPORT_TEXT_LIMITS } from "../../src/modules/applications/application/validation/application-schemas";
import type { ApplicationWordExportRecord } from "../../src/modules/word-export/application/word-export-repository";
import { DocxTemplateGenerator } from "../../src/modules/word-export/infrastructure/docx-template-generator";

const repeated = (length: number) => "W".repeat(length);
const relative = (position: number) => ({
  position,
  fullName: repeated(WORD_EXPORT_TEXT_LIMITS.relativeFullName),
  relationship: repeated(WORD_EXPORT_TEXT_LIMITS.relativeRelationship),
  occupation: repeated(WORD_EXPORT_TEXT_LIMITS.relativeOccupation),
  phone: "091234567890123",
  address: repeated(WORD_EXPORT_TEXT_LIMITS.relativeAddress),
});

const record: ApplicationWordExportRecord = {
  id: "22222222-2222-4222-8222-222222222222",
  applicationCode: "HS-2026-000001",
  status: "SUBMITTED",
  submittedAt: new Date(),
  majorName: repeated(WORD_EXPORT_TEXT_LIMITS.majorName),
  entryQualification: "THPT",
  fullName: repeated(WORD_EXPORT_TEXT_LIMITS.fullName),
  gender: "OTHER",
  dateOfBirth: "2000-12-31",
  placeOfBirth: repeated(WORD_EXPORT_TEXT_LIMITS.placeOfBirth),
  ethnicity: repeated(WORD_EXPORT_TEXT_LIMITS.ethnicity),
  religion: repeated(WORD_EXPORT_TEXT_LIMITS.religion),
  nationality: repeated(WORD_EXPORT_TEXT_LIMITS.nationality),
  citizenId: "123456789012",
  citizenIdIssuedDate: "2020-12-31",
  citizenIdIssuedPlace: repeated(WORD_EXPORT_TEXT_LIMITS.citizenIdIssuedPlace),
  permanentAddress: repeated(WORD_EXPORT_TEXT_LIMITS.permanentAddress),
  workplace: repeated(WORD_EXPORT_TEXT_LIMITS.workplace),
  phone: "0912345678",
  email: `${repeated(WORD_EXPORT_TEXT_LIMITS.email - "@example.com".length)}@example.com`,
  contactAddress: repeated(WORD_EXPORT_TEXT_LIMITS.contactAddress),
  admissionDiploma: "THPT",
  graduateMajor: repeated(WORD_EXPORT_TEXT_LIMITS.graduateMajor),
  graduationYear: 2100,
  highSchoolName: repeated(WORD_EXPORT_TEXT_LIMITS.highSchoolName),
  highSchoolWard: repeated(WORD_EXPORT_TEXT_LIMITS.highSchoolWard),
  highSchoolProvince: repeated(WORD_EXPORT_TEXT_LIMITS.highSchoolProvince),
  declarationPlace: repeated(WORD_EXPORT_TEXT_LIMITS.declarationPlace),
  declarationDate: "2026-08-10",
  relatives: [relative(1), relative(2)],
};

const outputDirectory = path.join(process.cwd(), ".scratch", "word-export");
fs.mkdirSync(outputDirectory, { recursive: true });
const outputPath = path.join(outputDirectory, "phieu-du-tuyen-max-qa.docx");
fs.writeFileSync(outputPath, new DocxTemplateGenerator().generate(record));
console.log(outputPath);
