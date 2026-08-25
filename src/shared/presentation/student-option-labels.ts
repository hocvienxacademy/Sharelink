export interface StudentOption {
  readonly label: string;
  readonly value: string;
}

export const GENDER_OPTIONS = [
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
  { value: "OTHER", label: "Khác" },
] as const satisfies readonly StudentOption[];

export const ADMISSION_QUALIFICATION_OPTIONS = [
  { value: "THPT", label: "Trung học phổ thông" },
  { value: "TC", label: "Trung cấp" },
  { value: "CD", label: "Cao đẳng" },
  { value: "DH", label: "Đại học" },
] as const satisfies readonly StudentOption[];

function displayOption(
  options: readonly StudentOption[],
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  return options.find((option) => option.value === value)?.label ?? "Không xác định";
}

export function formatGender(value: string | null | undefined): string | null {
  return displayOption(GENDER_OPTIONS, value);
}

export function formatAdmissionQualification(
  value: string | null | undefined,
): string | null {
  return displayOption(ADMISSION_QUALIFICATION_OPTIONS, value);
}
