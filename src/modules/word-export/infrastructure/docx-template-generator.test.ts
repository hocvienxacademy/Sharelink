import assert from "node:assert/strict";
import { describe, it } from "node:test";
import PizZip from "pizzip";
import { DocxTemplateGenerator } from "./docx-template-generator";
import type { ApplicationWordExportRecord } from "../application/word-export-repository";

const record: ApplicationWordExportRecord = {
  id: "22222222-2222-4222-8222-222222222222",
  applicationCode: "HS-001",
  status: "SUBMITTED",
  submittedAt: new Date("2026-08-10T08:00:00.000Z"),
  majorName: "Công nghệ thông tin",
  entryQualification: "THPT",
  fullName: "Nguyễn Văn A",
  gender: "MALE",
  dateOfBirth: "2005-01-02",
  placeOfBirth: "Trà Vinh",
  ethnicity: "Kinh",
  religion: "Không",
  nationality: "Việt Nam",
  citizenId: "001234567890",
  citizenIdIssuedDate: "2021-01-02",
  citizenIdIssuedPlace: "Cục Cảnh sát QLHC",
  permanentAddress: "Số 1, đường A, phường 1, thành phố Trà Vinh, tỉnh Trà Vinh",
  workplace: null,
  phone: "0901234567",
  email: "student@example.com",
  contactAddress: "Số 1, đường A, phường 1, thành phố Trà Vinh, tỉnh Trà Vinh",
  admissionDiploma: "THPT",
  graduateMajor: "Trung học phổ thông",
  graduationYear: 2023,
  highSchoolName: "Trường Trung học phổ thông A",
  highSchoolWard: "Phường 1",
  highSchoolProvince: "Trà Vinh",
  declarationPlace: "Trà Vinh",
  declarationDate: "2026-08-10",
  relatives: [{
    position: 1,
    fullName: "Nguyễn Văn B",
    relationship: "Cha",
    occupation: "Kinh doanh",
    phone: "0912345678",
    address: "Trà Vinh",
  }],
};

describe("DocxTemplateGenerator", () => {
  it("fills the official template without leaving placeholders or metadata authors", () => {
    const bytes = new DocxTemplateGenerator().generate(record);
    const zip = new PizZip(Buffer.from(bytes));
    const documentXml = zip.file("word/document.xml")?.asText();
    const coreXml = zip.file("docProps/core.xml")?.asText();

    assert.ok(documentXml);
    assert.ok(coreXml);

    assert.match(documentXml, /Nguyễn Văn A/);
    assert.match(documentXml, /Công nghệ thông tin/);
    assert.match(documentXml, /Nam/);
    assert.match(documentXml, /ngày 10 tháng 08 năm 2026/);
    assert.match(
      documentXml,
      /<w:sz w:val="20"\/><w:szCs w:val="20"\/><\/w:rPr><w:t[^>]*>Nguyễn Văn A<\/w:t>/,
    );
    assert.match(
      documentXml,
      /Công việc\/ Đơn vị công tác: <\/w:t><\/w:r><w:r>[\s\S]{0,180}<\/w:r><w:r><w:tab\/><\/w:r>/,
    );
    assert.match(
      documentXml,
      /Nguyễn Văn A<\/w:t><\/w:r><w:r><w:tab\/><\/w:r>/,
    );
    assert.match(
      documentXml,
      /student@example\.com<\/w:t><\/w:r><\/w:p>/,
    );
    assert.match(documentXml, /Đối tượng: từ \(THPT\/TC\/CĐ\/ĐH\)/);
    assert.doesNotMatch(documentXml, /w14:paraId="7FA5A099"/);
    assert.doesNotMatch(documentXml, /w14:paraId="64A6161A"/);
    assert.doesNotMatch(documentXml, /\{[a-z_]+\}/);
    assert.match(coreXml, /<dc:creator><\/dc:creator>/);
    assert.match(coreXml, /<cp:lastModifiedBy><\/cp:lastModifiedBy>/);
  });

  it("keeps the sample continuation lines when address fields are empty", () => {
    const bytes = new DocxTemplateGenerator().generate({
      ...record,
      permanentAddress: null,
      contactAddress: null,
      dateOfBirth: null,
      declarationDate: null,
    });
    const documentXml = new PizZip(Buffer.from(bytes))
      .file("word/document.xml")
      ?.asText();

    assert.ok(documentXml);
    assert.match(documentXml, /w14:paraId="7FA5A099"/);
    assert.match(documentXml, /w14:paraId="64A6161A"/);
    assert.match(documentXml, /\.\.\.\.\.\/\.\.\.\.\.\/\.\.\.\.\./);
    assert.match(documentXml, /ngày \.\.\.\.\.\. tháng \.\.\.\.\.\. năm \.\.\.\.\.\.\.\./);
  });

  it("keeps the sample font size while fitting long values into fixed fields", () => {
    const fullName = "W".repeat(50);
    const bytes = new DocxTemplateGenerator().generate({ ...record, fullName });
    const documentXml = new PizZip(Buffer.from(bytes))
      .file("word/document.xml")
      ?.asText();

    assert.ok(documentXml);
    assert.match(
      documentXml,
      new RegExp(
        `<w:sz w:val="20"/><w:szCs w:val="20"/><w:w w:val="56"/></w:rPr><w:t[^>]*>${fullName}</w:t>`,
      ),
    );
  });
});
