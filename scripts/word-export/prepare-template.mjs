import fs from "node:fs";
import path from "node:path";
import PizZip from "pizzip";

const templatePath = path.resolve(
  "src/modules/word-export/templates/phieu-du-tuyen-v1.docx",
);

const zip = new PizZip(fs.readFileSync(templatePath));
let xml = zip.file("word/document.xml").asText();

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function run(text, { bold = false, color = "0000FF", italic = false, size = 20, underline = false } = {}) {
  const properties = [
    bold ? "<w:b/>" : "",
    italic ? "<w:i/>" : "",
    `<w:color w:val="${color}"/>`,
    `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`,
    underline ? '<w:u w:val="single"/>' : "",
  ].join("");
  return `<w:r><w:rPr>${properties}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function blueLabel(text) {
  return run(text, { size: 20 });
}

function blueValue(tag, size = 16) {
  return run(`{${tag}}`, { size, underline: true });
}

function replaceParagraph(paraId, content) {
  const pattern = new RegExp(
    `(<w:p\\b[^>]*w14:paraId="${paraId}"[^>]*>)(<w:pPr>[\\s\\S]*?<\\/w:pPr>)?[\\s\\S]*?<\\/w:p>`,
  );
  if (!pattern.test(xml)) {
    throw new Error(`Paragraph ${paraId} was not found in the converted template.`);
  }
  xml = xml.replace(pattern, (_match, opening, properties = "") =>
    `${opening}${properties}${content}</w:p>`,
  );
}

replaceParagraph(
  "6594E461",
  run("Ngành: ", { color: "FF0000", size: 28 }) +
    run("{major_name}", { color: "FF0000", size: 14, underline: true }),
);
replaceParagraph(
  "51934D8C",
    run("Đối tượng: từ (", { color: "FF0000", size: 20 }) +
    run("{entry_qualification}", { color: "FF0000", size: 16, underline: true }) +
    run(") học lên Đại học", { color: "FF0000", size: 20 }),
);
replaceParagraph(
  "4CBB0D89",
  blueLabel(" Họ và tên khai sinh: ") + blueValue("full_name") +
    blueLabel("    Giới tính: ") + blueValue("gender"),
);
replaceParagraph(
  "3F030D80",
  blueLabel(" Ngày sinh: ") + blueValue("date_of_birth") +
    blueLabel("    Nơi sinh: ") + blueValue("place_of_birth"),
);
replaceParagraph(
  "7329B1FA",
  blueLabel(" Dân tộc: ") + blueValue("ethnicity") +
    blueLabel("  Tôn giáo: ") + blueValue("religion") +
    blueLabel("  Quốc tịch: ") + blueValue("nationality"),
);
replaceParagraph(
  "219DB2CB",
  blueLabel(" Số CCCD: ") + blueValue("citizen_id") +
    blueLabel("  Ngày cấp: ") + blueValue("citizen_id_issued_date") +
    blueLabel("  Nơi cấp: ") + blueValue("citizen_id_issued_place", 18),
);
replaceParagraph(
  "39E0C9AC",
  blueLabel(" Nơi thường trú: ") + blueValue("permanent_address", 18),
);
replaceParagraph(
  "100F1AFA",
  blueLabel(" Công việc/ Đơn vị công tác: ") + blueValue("workplace", 18),
);
replaceParagraph(
  "2E8A9302",
  blueLabel(" Điện thoại: ") + blueValue("phone") +
    blueLabel("    E-mail: ") + blueValue("email", 18),
);
replaceParagraph(
  "15367152",
  blueLabel(" Địa chỉ liên hệ: ") + blueValue("contact_address", 18),
);
replaceParagraph(
  "52AACFF1",
  blueLabel(" Bằng tốt nghiệp sử dụng đăng ký xét tuyển (THPT/TC/CĐ/ĐH): ") +
    blueValue("admission_diploma"),
);
replaceParagraph(
  "7DF82AFC",
  blueLabel(" Ngành tốt nghiệp: ") + blueValue("graduate_major", 18) +
    blueLabel("    Năm tốt nghiệp: ") + blueValue("graduation_year"),
);
replaceParagraph(
  "34960EF7",
  blueLabel(" Nơi học lớp 12 bậc THPT - Tên trường: ") +
    blueValue("high_school_name", 18),
);
replaceParagraph(
  "7BC8F8A9",
  blueLabel(" Tại xã/Phường: ") + blueValue("high_school_ward", 18) +
    blueLabel("    Tỉnh/TP: ") + blueValue("high_school_province", 18),
);
replaceParagraph(
  "4110B539",
  blueLabel("Họ và tên: ") + blueValue("relative_1_full_name", 18) +
    blueLabel("    Quan hệ: ") + blueValue("relative_1_relationship", 18),
);
replaceParagraph(
  "39051AFB",
  blueLabel("Nghề nghiệp: ") + blueValue("relative_1_occupation", 18) +
    blueLabel("    Điện thoại: ") + blueValue("relative_1_phone", 18),
);
replaceParagraph(
  "13E8EFC5",
  blueLabel("Địa chỉ: ") + blueValue("relative_1_address", 18),
);
replaceParagraph(
  "6A431136",
  blueLabel("Họ và tên: ") + blueValue("relative_2_full_name", 18) +
    blueLabel("    Quan hệ: ") + blueValue("relative_2_relationship", 18),
);
replaceParagraph(
  "29F82ABF",
  blueLabel("Nghề nghiệp: ") + blueValue("relative_2_occupation", 18) +
    blueLabel("    Điện thoại: ") + blueValue("relative_2_phone", 18),
);
replaceParagraph(
  "308CAAF8",
  blueLabel("Địa chỉ: ") + blueValue("relative_2_address", 18),
);
replaceParagraph(
  "33239D24",
  run("          ", { size: 20 }) +
    run("{declaration_place}, ngày {declaration_day} tháng {declaration_month} năm {declaration_year}", {
      italic: true,
      size: 20,
    }),
);

xml = xml.replace(/\s+w:rsid(?:R|RPr|RDefault|P|Del|Sect)="[^"]*"/g, "");
zip.file("word/document.xml", xml);

const core = zip.file("docProps/core.xml")?.asText();
if (core) {
  zip.file(
    "docProps/core.xml",
    core
      .replace(/<dc:creator>[\s\S]*?<\/dc:creator>/, "<dc:creator></dc:creator>")
      .replace(/<cp:lastModifiedBy>[\s\S]*?<\/cp:lastModifiedBy>/, "<cp:lastModifiedBy></cp:lastModifiedBy>"),
  );
}

fs.writeFileSync(templatePath, zip.generate({ type: "nodebuffer" }));
