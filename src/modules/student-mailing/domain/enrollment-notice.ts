/**
 * "Thông báo hoàn thiện thủ tục nhập học" (TBHTTTNH): the per-student notice
 * attached to the enrollment-completion email.
 */

/** Values that change per student or per intake; imported from Excel. */
export interface EnrollmentNoticeData {
  /** Notice date (`YYYY-MM-DD`); defaults to the day the file is created. */
  readonly issuedOn: string;
  readonly fullName: string;
  /** `YYYY-MM-DD` */
  readonly dateOfBirth: string;
  readonly major: string;
  readonly examLocation: string;
  /** "Đối tượng", e.g. THPT. */
  readonly admissionGroup: string;
  /** Intake month, e.g. `10/2026`. */
  readonly intake: string;
  readonly credits: number;
  /** Tuition per credit in VND. */
  readonly creditFee: number;
  /** Leading part of the transfer syntax, e.g. `1011`. */
  readonly paymentCode: string;
  /** `YYYY-MM-DD` */
  readonly paymentDeadline: string;
}

/** Values fixed by the notice template and edited only by ADMIN. */
export interface EnrollmentNoticeSettings {
  readonly studentCardFee: number;
  readonly bank: {
    readonly accountName: string;
    readonly accountNumber: string;
    readonly bankName: string;
    readonly branchName: string;
  };
  /** Text after the payment code, e.g. `Họ và tên + Số điện thoại + HP d1`. */
  readonly paymentSyntaxSuffix: string;
  readonly hotline: string;
  readonly address: string;
  readonly qrUrl: string;
}

export const DEFAULT_ENROLLMENT_NOTICE_SETTINGS: EnrollmentNoticeSettings = {
  studentCardFee: 100_000,
  bank: {
    accountName: "ĐẠI HỌC TRÀ VINH",
    accountNumber: "1234123499",
    bankName: "Vietcombank",
    branchName: "Trà Vinh",
  },
  paymentSyntaxSuffix: "Họ và tên + Số điện thoại + HP d1",
  hotline: "034.600.9899",
  address:
    "Phòng B11.204, Số 126 Nguyễn Thiện Thành, phường Hòa Thuận, tỉnh Vĩnh Long",
  qrUrl: "https://daihocsotvu.edu.vn/",
};

export interface EnrollmentNoticeAmounts {
  /** credits × credit fee */
  readonly tuition: number;
  /** tuition + student card fee */
  readonly total: number;
}

/** Amounts are always computed, never imported, so a typo cannot change them. */
export function computeEnrollmentNoticeAmounts(
  data: Pick<EnrollmentNoticeData, "credits" | "creditFee">,
  settings: Pick<EnrollmentNoticeSettings, "studentCardFee">,
): EnrollmentNoticeAmounts {
  const tuition = data.credits * data.creditFee;
  return { tuition, total: tuition + settings.studentCardFee };
}

const amountFormat = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

/** `3150000` → `3.150.000` (the notice appends its own "đ"). */
export function formatNoticeAmount(value: number): string {
  return amountFormat.format(value);
}

/** `2026-10-19` → `19/10/2026` */
export function formatNoticeDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/** `2026-10-19` → `{ day: "19", month: "10", year: "2026" }` */
export function noticeDateParts(isoDate: string) {
  const [year = "", month = "", day = ""] = isoDate.split("-");
  return { day, month, year };
}
