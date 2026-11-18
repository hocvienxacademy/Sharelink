/**
 * Mail stages are sequential: the tuition invoice (HĐHPĐ1) may only be sent
 * after the enrollment-completion notice (TBHTTTNH) has been sent.
 */
export const studentMailStages = [
  "NOT_SENT",
  "NOTICE_SENT",
  "INVOICE_SENT",
] as const;
export type StudentMailStage = (typeof studentMailStages)[number];

export const studentMailStageLabels: Readonly<
  Record<StudentMailStage, string>
> = {
  NOT_SENT: "Chưa gửi",
  NOTICE_SENT: "Đã gửi TBHTTTNH",
  INVOICE_SENT: "Đã gửi HĐHPĐ1",
};

export interface StudentMailRecipient {
  readonly id: string;
  readonly fullName: string;
  readonly classCode: string;
  readonly email: string;
  readonly phone: string;
  readonly stage: StudentMailStage;
}

export function canSendInvoice(
  recipient: Pick<StudentMailRecipient, "stage">,
): boolean {
  return recipient.stage !== "NOT_SENT";
}

export type RecipientTextField = "fullName" | "classCode" | "email" | "phone";
export type RecipientField = RecipientTextField | "stage";

export const recipientFieldLabels: Readonly<Record<RecipientField, string>> = {
  fullName: "Tên sinh viên",
  classCode: "Mã lớp",
  email: "Email",
  phone: "Số điện thoại",
  stage: "Trạng thái",
};

export type TextFilterOperator =
  | "contains"
  | "notContains"
  | "equals"
  | "startsWith"
  | "isEmpty"
  | "isNotEmpty";
export type StageFilterOperator = "is" | "isNot";

export const textFilterOperatorLabels: Readonly<
  Record<TextFilterOperator, string>
> = {
  contains: "chứa",
  notContains: "không chứa",
  equals: "là",
  startsWith: "bắt đầu bằng",
  isEmpty: "để trống",
  isNotEmpty: "không trống",
};

export const stageFilterOperatorLabels: Readonly<
  Record<StageFilterOperator, string>
> = {
  is: "là",
  isNot: "không phải",
};

export type RecipientFilterRule =
  | {
      readonly id: string;
      readonly field: RecipientTextField;
      readonly operator: TextFilterOperator;
      readonly value: string;
    }
  | {
      readonly id: string;
      readonly field: "stage";
      readonly operator: StageFilterOperator;
      readonly value: StudentMailStage;
    };

export type FilterConjunction = "and" | "or";

export interface RecipientSortRule {
  readonly id: string;
  readonly field: RecipientField;
  readonly direction: "asc" | "desc";
}

export function textOperatorNeedsValue(operator: TextFilterOperator): boolean {
  return operator !== "isEmpty" && operator !== "isNotEmpty";
}

const normalize = (value: string) =>
  value.normalize("NFC").trim().toLocaleLowerCase("vi");

function matchesRule(
  recipient: StudentMailRecipient,
  rule: RecipientFilterRule,
): boolean {
  if (rule.field === "stage") {
    return rule.operator === "is"
      ? recipient.stage === rule.value
      : recipient.stage !== rule.value;
  }
  const actual = normalize(recipient[rule.field]);
  const expected = normalize(rule.value);
  switch (rule.operator) {
    case "isEmpty":
      return actual === "";
    case "isNotEmpty":
      return actual !== "";
    // A rule whose value has not been typed yet must not hide every row.
    case "contains":
      return expected === "" || actual.includes(expected);
    case "notContains":
      return expected === "" || !actual.includes(expected);
    case "equals":
      return expected === "" || actual === expected;
    case "startsWith":
      return expected === "" || actual.startsWith(expected);
  }
}

export function filterRecipients(
  recipients: readonly StudentMailRecipient[],
  rules: readonly RecipientFilterRule[],
  conjunction: FilterConjunction,
  search = "",
): StudentMailRecipient[] {
  const keyword = normalize(search);
  return recipients.filter((recipient) => {
    if (
      keyword !== "" &&
      ![
        recipient.fullName,
        recipient.classCode,
        recipient.email,
        recipient.phone,
      ].some((value) => normalize(value).includes(keyword))
    )
      return false;
    if (rules.length === 0) return true;
    return conjunction === "and"
      ? rules.every((rule) => matchesRule(recipient, rule))
      : rules.some((rule) => matchesRule(recipient, rule));
  });
}

const collator = new Intl.Collator("vi", {
  numeric: true,
  sensitivity: "base",
});

export function sortRecipients(
  recipients: readonly StudentMailRecipient[],
  rules: readonly RecipientSortRule[],
): StudentMailRecipient[] {
  if (rules.length === 0) return [...recipients];
  return [...recipients].sort((left, right) => {
    for (const rule of rules) {
      const result =
        rule.field === "stage"
          ? studentMailStages.indexOf(left.stage) -
            studentMailStages.indexOf(right.stage)
          : collator.compare(left[rule.field], right[rule.field]);
      if (result !== 0) return rule.direction === "asc" ? result : -result;
    }
    return 0;
  });
}
