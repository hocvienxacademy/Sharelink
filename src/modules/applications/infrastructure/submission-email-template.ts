import fs from "node:fs";
import path from "node:path";
import type { SubmissionEmailWord } from "@/modules/word-export";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "src",
  "modules",
  "applications",
  "infrastructure",
  "templates",
  "submission-confirmation.html",
);

const qualificationLabels = {
  THPT: "Trung học phổ thông",
  TC: "Trung cấp",
  CD: "Cao đẳng",
  DH: "Đại học",
} as const;

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    })[character] ?? character,
  );
}

function formatSubmittedAt(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
  }).format(value);
}

function logoUrl(): string {
  const publicBaseUrl =
    process.env.APP_BASE_URL?.trim() ||
    process.env.RENDER_EXTERNAL_URL?.trim() ||
    "https://tuyensinhtuxa.tvu.edu.vn";
  return new URL("/images/logoTVU.jpg", publicBaseUrl).toString();
}

export function renderSubmissionEmailTemplate(
  data: SubmissionEmailWord["templateData"],
  template = fs.readFileSync(TEMPLATE_PATH, "utf8"),
): string {
  const values: Readonly<Record<string, string>> = {
    logo_tvu_url: logoUrl(),
    ho_ten: data.fullName,
    ma_phieu: data.applicationCode,
    nganh_dang_ky: data.majorName,
    doi_tuong_dau_vao: data.entryQualification === null
      ? "Chưa cập nhật"
      : qualificationLabels[data.entryQualification],
    thoi_gian_gui: formatSubmittedAt(data.submittedAt),
  };

  return template.replace(/{{\s*([a-z_]+)\s*}}/g, (_placeholder, key: string) => {
    const value = values[key];
    if (value === undefined) {
      throw new Error(`Unknown submission email template variable: ${key}`);
    }
    return escapeHtml(value);
  });
}
