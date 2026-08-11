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

function blueValue(tag) {
  return run(`{${tag}}`, { size: 20 });
}

function tab() {
  return "<w:r><w:tab/></w:r>";
}

function dottedTabs(positions) {
  return `<w:tabs>${positions
    .map((position) => `<w:tab w:val="left" w:leader="dot" w:pos="${position}"/>`)
    .join("")}</w:tabs>`;
}

function replaceParagraph(paraId, content, tabPositions = null) {
  const pattern = new RegExp(
    `(<w:p\\b[^>]*w14:paraId="${paraId}"[^>]*>)(<w:pPr>[\\s\\S]*?<\\/w:pPr>)?[\\s\\S]*?<\\/w:p>`,
  );
  if (!pattern.test(xml)) {
    throw new Error(`Paragraph ${paraId} was not found in the converted template.`);
  }
  xml = xml.replace(pattern, (_match, opening, properties = "") => {
    let nextProperties = properties;
    if (tabPositions !== null) {
      const tabs = dottedTabs(tabPositions);
      nextProperties = nextProperties.includes("<w:tabs>")
        ? nextProperties.replace(/<w:tabs>[\s\S]*?<\/w:tabs>/, tabs)
        : nextProperties.replace("<w:pPr>", `<w:pPr>${tabs}`);
    }
    return `${opening}${nextProperties}${content}</w:p>`;
  });
}

replaceParagraph(
  "6594E461",
  run("Ngành: ", { color: "FF0000", size: 28 }) +
    run("{major_name}", { color: "FF0000", size: 20 }),
);
replaceParagraph(
  "51934D8C",
    run("Đối tượng: từ (THPT/TC/CĐ/ĐH).....................học lên Đại học", {
      color: "FF0000",
      size: 20,
    }),
);
replaceParagraph(
  "4CBB0D89",
  blueLabel(" Họ và tên khai sinh: ") + blueValue("full_name") + tab() +
    blueLabel("Giới tính: ") + blueValue("gender") + tab(),
  [6000, 9072],
);
replaceParagraph(
  "3F030D80",
  blueLabel(" Ngày sinh: ") + blueValue("date_of_birth") + tab() +
    blueLabel("Nơi sinh: ") + blueValue("place_of_birth") + tab(),
  [3600, 9072],
);
replaceParagraph(
  "7329B1FA",
  blueLabel(" Dân tộc: ") + blueValue("ethnicity") + tab() +
    blueLabel("Tôn giáo: ") + blueValue("religion") + tab() +
    blueLabel("Quốc tịch: ") + blueValue("nationality") + tab(),
  [3000, 6200, 9072],
);
replaceParagraph(
  "219DB2CB",
  blueLabel(" Số CCCD: ") + blueValue("citizen_id") + tab() +
    blueLabel("Ngày cấp: ") + blueValue("citizen_id_issued_date") + tab() +
    blueLabel("Nơi cấp: ") + blueValue("citizen_id_issued_place") + tab(),
  [3200, 6200, 9072],
);
replaceParagraph(
  "39E0C9AC",
  blueLabel(" Nơi thường trú: ") + blueValue("permanent_address") + tab(),
  [9072],
);
replaceParagraph(
  "100F1AFA",
  blueLabel(" Công việc/ Đơn vị công tác: ") + blueValue("workplace") + tab(),
  [9072],
);
replaceParagraph(
  "2E8A9302",
  blueLabel(" Điện thoại: ") + blueValue("phone") + tab() +
    blueLabel("E-mail: ") + blueValue("email") + tab(),
  [3600, 9072],
);
replaceParagraph(
  "15367152",
  blueLabel(" Địa chỉ liên hệ: ") + blueValue("contact_address") + tab(),
  [9072],
);
replaceParagraph(
  "52AACFF1",
  blueLabel(" Bằng tốt nghiệp sử dụng đăng ký xét tuyển (THPT/TC/CĐ/ĐH): ") +
    blueValue("admission_diploma") + tab(),
  [9072],
);
replaceParagraph(
  "7DF82AFC",
  blueLabel(" Ngành tốt nghiệp: ") + blueValue("graduate_major") + tab() +
    blueLabel("Năm tốt nghiệp: ") + blueValue("graduation_year") + tab(),
  [5800, 9072],
);
replaceParagraph(
  "34960EF7",
  blueLabel(" Nơi học lớp 12 bậc THPT - Tên trường: ") +
    blueValue("high_school_name") + tab(),
  [9072],
);
replaceParagraph(
  "7BC8F8A9",
  blueLabel(" Tại xã/Phường: ") + blueValue("high_school_ward") + tab() +
    blueLabel("Tỉnh/TP: ") + blueValue("high_school_province") + tab(),
  [5200, 9072],
);
replaceParagraph(
  "4110B539",
  blueLabel("Họ và tên: ") + blueValue("relative_1_full_name") + tab() +
    blueLabel("Quan hệ: ") + blueValue("relative_1_relationship") + tab(),
  [5670, 9072],
);
replaceParagraph(
  "39051AFB",
  blueLabel("Nghề nghiệp: ") + blueValue("relative_1_occupation") + tab() +
    blueLabel("Điện thoại: ") + blueValue("relative_1_phone") + tab(),
  [5103, 9072],
);
replaceParagraph(
  "13E8EFC5",
  blueLabel("Địa chỉ: ") + blueValue("relative_1_address") + tab(),
  [9072],
);
replaceParagraph(
  "6A431136",
  blueLabel("Họ và tên: ") + blueValue("relative_2_full_name") + tab() +
    blueLabel("Quan hệ: ") + blueValue("relative_2_relationship") + tab(),
  [5670, 9072],
);
replaceParagraph(
  "29F82ABF",
  blueLabel("Nghề nghiệp: ") + blueValue("relative_2_occupation") + tab() +
    blueLabel("Điện thoại: ") + blueValue("relative_2_phone") + tab(),
  [5103, 9072],
);
replaceParagraph(
  "308CAAF8",
  blueLabel("Địa chỉ: ") + blueValue("relative_2_address") + tab(),
  [9072],
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
