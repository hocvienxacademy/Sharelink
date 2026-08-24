import type { ValidationIssue } from "../../../../shared/validation/index";
import type {
  Application,
  ApplicationRelative,
} from "../../domain/application";
import type { SubmissionPolicy } from "../ports/application-repository";

const RELATIVE_POSITION_MIN = 1;
const RELATIVE_POSITION_MAX = 2;

export const RELATIVE_COMPLETENESS_FIELDS = [
  "fullName",
  "relationship",
  "occupation",
  "phone",
  "address",
] as const;

export type RelativeCompletenessField =
  (typeof RELATIVE_COMPLETENESS_FIELDS)[number];

export interface DefaultSubmissionPolicyConfig {
  readonly minimumRelatives: number;
  readonly maximumRelatives: number;
  readonly requiredRelativePositions: readonly number[];
  readonly requiredRelativeFields: readonly RelativeCompletenessField[];
}

export const DEFAULT_SUBMISSION_POLICY_CONFIG: DefaultSubmissionPolicyConfig = {
  minimumRelatives: 0,
  maximumRelatives: 2,
  requiredRelativePositions: [],
  requiredRelativeFields: RELATIVE_COMPLETENESS_FIELDS,
};

function isMissingText(value: string | null): boolean {
  return value === null || value.trim().length === 0;
}

function requiredIssue(
  path: readonly (string | number)[],
  message: string,
): ValidationIssue {
  return {
    path,
    code: "required",
    message,
  };
}

function isRelativeEmpty(relative: ApplicationRelative): boolean {
  return RELATIVE_COMPLETENESS_FIELDS.every((field) =>
    isMissingText(relative[field]),
  );
}

function assertValidConfiguration(
  config: DefaultSubmissionPolicyConfig,
): void {
  if (
    !Number.isInteger(config.minimumRelatives) ||
    !Number.isInteger(config.maximumRelatives) ||
    config.minimumRelatives < 0 ||
    config.maximumRelatives < 0 ||
    config.minimumRelatives > config.maximumRelatives ||
    config.maximumRelatives > RELATIVE_POSITION_MAX
  ) {
    throw new Error(
      "Relative count configuration must satisfy 0 <= minimum <= maximum <= 2.",
    );
  }

  const uniquePositions = new Set(config.requiredRelativePositions);

  if (
    uniquePositions.size !== config.requiredRelativePositions.length ||
    config.requiredRelativePositions.some(
      (position) =>
        !Number.isInteger(position) ||
        position < RELATIVE_POSITION_MIN ||
        position > RELATIVE_POSITION_MAX,
    ) ||
    uniquePositions.size > config.minimumRelatives
  ) {
    throw new Error(
      "Required relative positions must be unique, between 1 and 2, and covered by minimumRelatives.",
    );
  }

  if (
    new Set(config.requiredRelativeFields).size !==
      config.requiredRelativeFields.length ||
    config.requiredRelativeFields.some(
      (field) => !RELATIVE_COMPLETENESS_FIELDS.includes(field),
    )
  ) {
    throw new Error("Required relative fields must be unique and supported.");
  }
}

export class DefaultSubmissionPolicy implements SubmissionPolicy {
  readonly config: DefaultSubmissionPolicyConfig;

  constructor(
    config: Partial<DefaultSubmissionPolicyConfig> = {},
  ) {
    this.config = {
      ...DEFAULT_SUBMISSION_POLICY_CONFIG,
      ...config,
      requiredRelativePositions:
        config.requiredRelativePositions ??
        DEFAULT_SUBMISSION_POLICY_CONFIG.requiredRelativePositions,
      requiredRelativeFields:
        config.requiredRelativeFields ??
        DEFAULT_SUBMISSION_POLICY_CONFIG.requiredRelativeFields,
    };
    assertValidConfiguration(this.config);
  }

  validate(application: Application): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    this.validatePersonalInformation(application, issues);
    this.validateAdmissionSelections(application, issues);
    this.validateRelatives(application.relatives, issues);

    return issues;
  }

  private validatePersonalInformation(
    application: Application,
    issues: ValidationIssue[],
  ): void {
    if (isMissingText(application.fullName)) {
      issues.push(requiredIssue(["fullName"], "Vui lòng nhập họ và tên."));
    }

    if (application.dateOfBirth === null) {
      issues.push(requiredIssue(["dateOfBirth"], "Vui lòng nhập ngày sinh."));
    }

    if (application.gender === null) {
      issues.push(requiredIssue(["gender"], "Vui lòng chọn giới tính."));
    }

    if (isMissingText(application.placeOfBirth)) {
      issues.push(requiredIssue(["placeOfBirth"], "Vui lòng nhập nơi sinh."));
    }

    if (isMissingText(application.ethnicity)) {
      issues.push(requiredIssue(["ethnicity"], "Vui lòng nhập dân tộc."));
    }

    if (isMissingText(application.religion)) {
      issues.push(requiredIssue(["religion"], "Vui lòng nhập tôn giáo."));
    }

    if (isMissingText(application.nationality)) {
      issues.push(requiredIssue(["nationality"], "Vui lòng nhập quốc tịch."));
    }

    if (isMissingText(application.phone)) {
      issues.push(requiredIssue(["phone"], "Vui lòng nhập số điện thoại."));
    }

    if (isMissingText(application.citizenId)) {
      issues.push(
        requiredIssue(
          ["citizenId"],
          "Vui lòng nhập CCCD hoặc giấy tờ định danh.",
        ),
      );
    }

    if (application.citizenIdIssuedDate === null) {
      issues.push(
        requiredIssue(
          ["citizenIdIssuedDate"],
          "Vui lòng nhập ngày cấp CCCD hoặc giấy tờ định danh.",
        ),
      );
    }

    if (isMissingText(application.citizenIdIssuedPlace)) {
      issues.push(
        requiredIssue(
          ["citizenIdIssuedPlace"],
          "Vui lòng nhập nơi cấp CCCD hoặc giấy tờ định danh.",
        ),
      );
    }

    if (isMissingText(application.permanentAddress)) {
      issues.push(
        requiredIssue(
          ["permanentAddress"],
          "Vui lòng nhập địa chỉ thường trú.",
        ),
      );
    }

    if (isMissingText(application.contactAddress)) {
      issues.push(
        requiredIssue(
          ["contactAddress"],
          "Vui lòng nhập địa chỉ liên hệ.",
        ),
      );
    }

    if (isMissingText(application.email)) {
      issues.push(requiredIssue(["email"], "Vui lòng nhập email."));
    }

    if (application.admissionDiploma === null) {
      issues.push(
        requiredIssue(
          ["admissionDiploma"],
          "Vui lòng chọn bằng tốt nghiệp dùng để đăng ký xét tuyển.",
        ),
      );
    }

    if (isMissingText(application.graduateMajor)) {
      issues.push(
        requiredIssue(["graduateMajor"], "Vui lòng nhập ngành tốt nghiệp."),
      );
    }

    if (application.graduationYear === null) {
      issues.push(
        requiredIssue(["graduationYear"], "Vui lòng nhập năm tốt nghiệp."),
      );
    }

    if (isMissingText(application.highSchoolName)) {
      issues.push(
        requiredIssue(
          ["highSchoolName"],
          "Vui lòng nhập tên trường THPT nơi học lớp 12.",
        ),
      );
    }

    if (isMissingText(application.highSchoolWard)) {
      issues.push(
        requiredIssue(
          ["highSchoolWard"],
          "Vui lòng nhập xã/phường của trường THPT.",
        ),
      );
    }

    if (isMissingText(application.highSchoolProvince)) {
      issues.push(
        requiredIssue(
          ["highSchoolProvince"],
          "Vui lòng nhập tỉnh/thành phố của trường THPT.",
        ),
      );
    }
  }

  private validateAdmissionSelections(
    application: Application,
    issues: ValidationIssue[],
  ): void {
    if (application.majorId === null) {
      issues.push(requiredIssue(["majorId"], "Vui lòng chọn ngành đăng ký."));
    }

    if (application.entryQualification === null) {
      issues.push(
        requiredIssue(
          ["entryQualification"],
          "Vui lòng chọn đối tượng đầu vào.",
        ),
      );
    }
  }

  private validateRelatives(
    relatives: readonly ApplicationRelative[],
    issues: ValidationIssue[],
  ): void {
    if (relatives.length < this.config.minimumRelatives) {
      issues.push({
        path: ["relatives"],
        code: "minimum_relatives",
        message: `Vui lòng cung cấp ít nhất ${this.config.minimumRelatives} người thân.`,
      });
    }

    if (relatives.length > this.config.maximumRelatives) {
      issues.push({
        path: ["relatives"],
        code: "maximum_relatives",
        message: `Chỉ được cung cấp tối đa ${this.config.maximumRelatives} người thân.`,
      });
    }

    const positionIndexes = new Map<number, number>();

    relatives.forEach((relative, index) => {
      const existingIndex = positionIndexes.get(relative.position);

      if (existingIndex !== undefined) {
        issues.push({
          path: ["relatives", index, "position"],
          code: "duplicate_relative_position",
          message: "Vị trí người thân không được trùng nhau.",
        });
      } else {
        positionIndexes.set(relative.position, index);
      }

      if (isRelativeEmpty(relative)) {
        issues.push({
          path: ["relatives", index],
          code: "empty_relative",
          message: "Thông tin người thân không được để trống hoàn toàn.",
        });
      }

      for (const field of this.config.requiredRelativeFields) {
        if (isMissingText(relative[field])) {
          issues.push(
            requiredIssue(
              ["relatives", index, field],
              `Vui lòng nhập ${this.relativeFieldLabel(field)}.`,
            ),
          );
        }
      }
    });

    for (const position of this.config.requiredRelativePositions) {
      if (!positionIndexes.has(position)) {
        issues.push({
          path: ["relatives"],
          code: "required_relative_position",
          message: `Vui lòng cung cấp người thân ở vị trí ${position}.`,
        });
      }
    }
  }

  private relativeFieldLabel(field: RelativeCompletenessField): string {
    const labels: Record<RelativeCompletenessField, string> = {
      fullName: "họ tên người thân",
      relationship: "mối quan hệ với người thân",
      occupation: "nghề nghiệp người thân",
      phone: "số điện thoại người thân",
      address: "địa chỉ người thân",
    };

    return labels[field];
  }
}
