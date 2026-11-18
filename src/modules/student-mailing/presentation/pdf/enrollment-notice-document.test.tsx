import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { renderToBuffer } from "@react-pdf/renderer";
import { DEFAULT_ENROLLMENT_NOTICE_SETTINGS } from "../../domain/enrollment-notice";
import { DEFAULT_ENROLLMENT_NOTICE_LAYOUT } from "../../domain/enrollment-notice-layout";
import {
  EnrollmentNoticeDocument,
  registerEnrollmentNoticeFonts,
} from "./enrollment-notice-document";
import { createNoticeQrCode } from "./notice-qr-code";

registerEnrollmentNoticeFonts((file) =>
  path.resolve("public/fonts/tinos", file),
);

describe("EnrollmentNoticeDocument", () => {
  it("renders a one-page PDF, even for long names and majors", async () => {
    const pdf = await renderToBuffer(
      <EnrollmentNoticeDocument
        data={{
          issuedOn: "2026-10-19",
          fullName: "Nguyễn Thị Hồng Nhung Phương Thảo Ngọc Diễm",
          dateOfBirth: "2003-09-26",
          major: "Quản trị dịch vụ du lịch và lữ hành quốc tế",
          examLocation: "TVU",
          admissionGroup: "THPT",
          intake: "10/2026",
          credits: 7,
          creditFee: 450_000,
          paymentCode: "1011",
          paymentDeadline: "2026-10-19",
        }}
        settings={DEFAULT_ENROLLMENT_NOTICE_SETTINGS}
        layout={DEFAULT_ENROLLMENT_NOTICE_LAYOUT}
        assets={{
          qrCode: await createNoticeQrCode(
            DEFAULT_ENROLLMENT_NOTICE_SETTINGS.qrUrl,
          ),
        }}
      />,
    );

    const text = pdf.toString("latin1");
    assert.equal(text.slice(0, 5), "%PDF-");
    assert.equal(text.match(/\/Type \/Page\b/g)?.length, 1);
  });
});
