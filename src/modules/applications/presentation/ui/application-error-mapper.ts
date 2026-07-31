import type { ValidationIssue } from "./application-api-client";

const fieldLabels: Readonly<Record<string, string>> = {
  majorId: "Ngành đăng ký",
  entryQualification: "Đối tượng đầu vào",
  fullName: "Họ và tên",
  gender: "Giới tính",
  dateOfBirth: "Ngày sinh",
  placeOfBirth: "Nơi sinh",
  ethnicity: "Dân tộc",
  religion: "Tôn giáo",
  nationality: "Quốc tịch",
  citizenId: "CCCD hoặc giấy tờ định danh",
  citizenIdIssuedDate: "Ngày cấp giấy tờ định danh",
  citizenIdIssuedPlace: "Nơi cấp giấy tờ định danh",
  permanentAddress: "Địa chỉ thường trú",
  workplace: "Công việc hoặc đơn vị công tác",
  phone: "Số điện thoại",
  email: "Email",
  contactAddress: "Địa chỉ liên hệ",
  admissionDiploma: "Bằng dùng để đăng ký xét tuyển",
  graduateMajor: "Ngành tốt nghiệp",
  graduationYear: "Năm tốt nghiệp",
  highSchoolName: "Trường THPT",
  highSchoolWard: "Xã/phường của trường THPT",
  highSchoolProvince: "Tỉnh/thành phố của trường THPT",
  declarationPlace: "Nơi khai hồ sơ",
  declarationDate: "Ngày khai hồ sơ",
  declarationConfirmed: "Xác nhận lời khai",
  dataProcessingConsent: "Đồng ý xử lý dữ liệu",
  relatives: "Thông tin người thân",
};

export interface MappedValidationIssues {
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>;
  readonly generalMessages: readonly string[];
  readonly summaryItems: readonly string[];
  readonly firstField: string | null;
}

function toFieldPath(path: readonly (string | number)[]): string | null {
  if (path.length === 0 || typeof path[0] !== "string") {
    return null;
  }

  if (path[0] !== "relatives") {
    return path.length === 1 && fieldLabels[path[0]] !== undefined
      ? path[0]
      : null;
  }

  if (path.length === 1) {
    return "relatives";
  }

  if (
    path.length === 3 &&
    typeof path[1] === "number" &&
    (path[1] === 0 || path[1] === 1) &&
    typeof path[2] === "string" &&
    ["fullName", "relationship", "occupation", "phone", "address"].includes(
      path[2],
    )
  ) {
    return `relatives.${path[1]}.${path[2]}`;
  }

  return null;
}

function labelForPath(path: string): string {
  if (!path.startsWith("relatives.")) {
    return fieldLabels[path] ?? "Thông tin hồ sơ";
  }

  const [, index, field] = path.split(".");
  const relativeFieldLabels: Readonly<Record<string, string>> = {
    fullName: "Họ tên",
    relationship: "Quan hệ",
    occupation: "Nghề nghiệp",
    phone: "Điện thoại",
    address: "Địa chỉ",
  };

  return `${relativeFieldLabels[field] ?? "Thông tin"} người thân ${Number(index) + 1}`;
}

export function mapValidationIssues(
  issues: readonly ValidationIssue[],
): MappedValidationIssues {
  const fieldErrors: Record<string, string[]> = {};
  const generalMessages: string[] = [];
  const summaryItems: string[] = [];
  let firstField: string | null = null;

  for (const issue of issues) {
    const path = toFieldPath(issue.path);

    if (path === null) {
      generalMessages.push(
        "Một phần thông tin chưa hợp lệ. Vui lòng kiểm tra lại hồ sơ.",
      );
      continue;
    }

    fieldErrors[path] = [...(fieldErrors[path] ?? []), issue.message];
    firstField ??= path;

    const label = labelForPath(path);
    if (!summaryItems.includes(label)) {
      summaryItems.push(label);
    }
  }

  return {
    fieldErrors,
    generalMessages,
    summaryItems,
    firstField,
  };
}
