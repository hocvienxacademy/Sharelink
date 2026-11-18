/**
 * Renders a sample TBHTTTNH notice for visual comparison with the approved PDF.
 *
 *   npx tsx scripts/render-enrollment-notice-sample.tsx <output.pdf> [data.json]
 *
 * Images are read from docs/samples/tbhtttnh (stamp and signature stay local,
 * see the README there). Without data.json a fictitious student is used.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import React from "react";
import { renderToFile } from "@react-pdf/renderer";
import {
  DEFAULT_ENROLLMENT_NOTICE_SETTINGS,
  type EnrollmentNoticeData,
} from "../src/modules/student-mailing/domain/enrollment-notice";
import { DEFAULT_ENROLLMENT_NOTICE_LAYOUT } from "../src/modules/student-mailing/domain/enrollment-notice-layout";
import {
  EnrollmentNoticeDocument,
  registerEnrollmentNoticeFonts,
} from "../src/modules/student-mailing/presentation/pdf/enrollment-notice-document";
import { createNoticeQrCode } from "../src/modules/student-mailing/presentation/pdf/notice-qr-code";

void React;

const SAMPLES = path.resolve("docs/samples/tbhtttnh");

const FICTITIOUS_STUDENT: EnrollmentNoticeData = {
  issuedOn: "2026-10-19",
  fullName: "Nguyễn Văn An",
  dateOfBirth: "2003-09-26",
  major: "Quản trị văn phòng",
  examLocation: "TVU",
  admissionGroup: "THPT",
  intake: "10/2026",
  credits: 7,
  creditFee: 450_000,
  paymentCode: "1011",
  paymentDeadline: "2026-10-19",
};

async function dataUri(
  fileName: string,
  mime: string,
): Promise<string | undefined> {
  try {
    const bytes = await readFile(path.join(SAMPLES, fileName));
    return `data:${mime};base64,${bytes.toString("base64")}`;
  } catch {
    console.warn(`Missing ${fileName}; that layer is skipped.`);
    return undefined;
  }
}

const [output, dataFile] = process.argv.slice(2);
if (output === undefined) {
  console.error(
    "Usage: tsx scripts/render-enrollment-notice-sample.tsx <output.pdf> [data.json]",
  );
  process.exit(1);
}

registerEnrollmentNoticeFonts((file) =>
  path.resolve("public/fonts/tinos", file),
);

const data: EnrollmentNoticeData =
  dataFile === undefined
    ? FICTITIOUS_STUDENT
    : (JSON.parse(await readFile(dataFile, "utf8")) as EnrollmentNoticeData);

await renderToFile(
  <EnrollmentNoticeDocument
    data={data}
    settings={DEFAULT_ENROLLMENT_NOTICE_SETTINGS}
    layout={DEFAULT_ENROLLMENT_NOTICE_LAYOUT}
    assets={{
      watermark: await dataUri("logo-tvu.png", "image/png"),
      stamp: await dataUri("moc-do.png", "image/png"),
      signature: await dataUri("chu-ky-nhay.png", "image/png"),
      qrCode: await createNoticeQrCode(
        DEFAULT_ENROLLMENT_NOTICE_SETTINGS.qrUrl,
      ),
    }}
  />,
  output,
);
console.log(`Rendered ${output}`);
