import type { ReactNode } from "react";
import {
  Document,
  Font,
  Image,
  Page,
  Text,
  View,
  type Styles,
} from "@react-pdf/renderer";
import {
  computeEnrollmentNoticeAmounts,
  formatNoticeAmount,
  formatNoticeDate,
  noticeDateParts,
  type EnrollmentNoticeData,
  type EnrollmentNoticeSettings,
} from "../../domain/enrollment-notice";
import type {
  EnrollmentNoticeLayout,
  NoticeImagePlacement,
} from "../../domain/enrollment-notice-layout";

const FONT_FAMILY = "Tinos";
const FONT_FILES = {
  regular: "Tinos-Regular.ttf",
  bold: "Tinos-Bold.ttf",
  italic: "Tinos-Italic.ttf",
  boldItalic: "Tinos-BoldItalic.ttf",
} as const;

let fontsRegistered = false;

/**
 * Registers Tinos (metric-compatible with Times New Roman, so lines break
 * exactly like the Word original). `resolveFont` maps a file name to a URL in
 * the browser or an absolute path on the server.
 */
export function registerEnrollmentNoticeFonts(
  resolveFont: (fileName: string) => string,
): void {
  if (fontsRegistered) return;
  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: resolveFont(FONT_FILES.regular) },
      { src: resolveFont(FONT_FILES.bold), fontWeight: "bold" },
      { src: resolveFont(FONT_FILES.italic), fontStyle: "italic" },
      {
        src: resolveFont(FONT_FILES.boldItalic),
        fontWeight: "bold",
        fontStyle: "italic",
      },
    ],
  });
  // Vietnamese words must never be split with a hyphen.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

/** An image as a URL or data URI. */
export type NoticeImageSource = string;

export interface EnrollmentNoticeAssets {
  readonly watermark?: NoticeImageSource;
  readonly stamp?: NoticeImageSource;
  readonly signature?: NoticeImageSource;
  /** Pre-rendered QR code (see `createNoticeQrCode`). */
  readonly qrCode?: NoticeImageSource;
}

export interface EnrollmentNoticeDocumentProps {
  readonly data: EnrollmentNoticeData;
  readonly settings: EnrollmentNoticeSettings;
  readonly layout: EnrollmentNoticeLayout;
  readonly assets: EnrollmentNoticeAssets;
}

// Measurements (points) taken from the approved final PDF.
// The final PDF was exported through Affinity, which scaled 14 pt to 14.05 pt.
const BODY_SIZE = 14.05;
const HEADER_SMALL_SIZE = 12.95;
// Vietnamese accented glyphs of Times New Roman are slightly wider than in
// Tinos. Every paragraph breaks exactly like the final PDF for tracking
// 0.13–0.21 pt; 0.16 sits in the middle of that range.
const BODY_TRACKING = 0.16;
// Centred title lines match best with slightly less tracking.
const TITLE_TRACKING = 0.1;
const FOOTER_SIZE = 8.05;
const ASCENT = 0.891; // Tinos / Times New Roman ascender, as a share of the font size
const LINE_PITCH = 16.1;
const BODY_LEFT = 79.4;
const BODY_RIGHT = 552.8;
const PARAGRAPH_INDENT = 114.8 - BODY_LEFT;
const FIELD_LEFT = 64.7;
const FIELD_RIGHT_COLUMN = 372.8;
const AMOUNT_LEFT = 305.9;
const SECTION_LEFT = 100.7;
const DETAIL_LEFT = 114.8;

/** `top` of a text box whose first baseline sits at `baseline`. */
const topFor = (baseline: number, size = BODY_SIZE) => baseline - ASCENT * size;

const styles: Styles = {
  page: { fontFamily: FONT_FAMILY, fontSize: BODY_SIZE, color: "#000000" },
  bold: { fontWeight: "bold" },
  italic: { fontStyle: "italic" },
  boldItalic: { fontWeight: "bold", fontStyle: "italic" },
};

function Line({
  baseline,
  left,
  width,
  size = BODY_SIZE,
  tracking = BODY_TRACKING,
  align = "left",
  style,
  children,
}: {
  readonly baseline: number;
  readonly left: number;
  readonly width?: number;
  readonly size?: number;
  readonly tracking?: number;
  readonly align?: "left" | "center" | "right";
  readonly style?: Styles[string];
  readonly children: ReactNode;
}) {
  return (
    <Text
      style={{
        position: "absolute",
        top: topFor(baseline, size),
        left,
        width: width ?? 595 - left,
        fontSize: size,
        letterSpacing: tracking,
        textAlign: align,
        ...style,
      }}
    >
      {children}
    </Text>
  );
}

/** A justified paragraph across the body column, like the Word original. */
function Paragraph({
  baseline,
  indent = PARAGRAPH_INDENT,
  pitch = LINE_PITCH,
  style,
  children,
}: {
  readonly baseline: number;
  readonly indent?: number;
  readonly pitch?: number;
  readonly style?: Styles[string];
  readonly children: ReactNode;
}) {
  return (
    <Text
      style={{
        position: "absolute",
        top: topFor(baseline),
        left: BODY_LEFT,
        width: BODY_RIGHT - BODY_LEFT,
        fontSize: BODY_SIZE,
        letterSpacing: BODY_TRACKING,
        lineHeight: pitch / BODY_SIZE,
        textIndent: indent,
        textAlign: "justify",
        ...style,
      }}
    >
      {children}
    </Text>
  );
}

function PlacedImage({
  source,
  placement,
}: {
  readonly source: NoticeImageSource | undefined;
  readonly placement: NoticeImagePlacement;
}) {
  if (source === undefined || !placement.visible) return null;
  return (
    // oxlint-disable-next-line jsx-a11y/alt-text -- react-pdf images have no alt attribute
    <Image
      src={source}
      style={{
        position: "absolute",
        left: placement.x,
        top: placement.y,
        width: placement.width,
        height: placement.height,
        opacity: placement.opacity,
        ...(placement.rotation === 0
          ? {}
          : { transform: `rotate(${placement.rotation}deg)` }),
      }}
    />
  );
}

function Rule({
  left,
  right,
  top,
}: {
  readonly left: number;
  readonly right: number;
  readonly top: number;
}) {
  return (
    <View
      style={{
        position: "absolute",
        left,
        top,
        width: right - left,
        height: 1,
        backgroundColor: "#000000",
      }}
    />
  );
}

export function EnrollmentNoticeDocument({
  data,
  settings,
  layout,
  assets,
}: EnrollmentNoticeDocumentProps) {
  const amounts = computeEnrollmentNoticeAmounts(data, settings);
  const issued = noticeDateParts(data.issuedOn);
  const { bank } = settings;

  return (
    <Document title={`TBHTTTNH - ${data.fullName}`} language="vi">
      <Page size="A4" style={styles.page}>
        <PlacedImage source={assets.watermark} placement={layout.watermark} />

        {/* Header */}
        <Line
          baseline={46.7}
          left={116.6}
          size={HEADER_SMALL_SIZE}
          tracking={0}
        >
          ĐẠI HỌC TRÀ VINH
        </Line>
        <Line baseline={62.6} left={67.0} tracking={0} style={styles.bold}>
          VIỆN PHÁT TRIỂN NGUỒN LỰC
        </Line>
        <Rule left={69.7} right={278.2} top={66.5} />
        <Line
          baseline={46.7}
          left={311.6}
          size={HEADER_SMALL_SIZE}
          tracking={0}
          style={styles.bold}
        >
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        </Line>
        <Line baseline={62.6} left={359.3} tracking={0} style={styles.bold}>
          Độc lập – Tự do – Hạnh phúc
        </Line>
        <Rule left={360.9} right={533.4} top={67.4} />
        <Line
          baseline={84.7}
          left={300}
          width={284.44}
          align="right"
          tracking={0}
          style={styles.italic}
        >
          Vĩnh Long, ngày {issued.day} tháng {issued.month} năm {issued.year}
        </Line>

        {/* Title */}
        <Line
          baseline={116.9}
          left={BODY_LEFT}
          width={BODY_RIGHT - BODY_LEFT}
          align="center"
          tracking={TITLE_TRACKING}
          style={styles.bold}
        >
          THÔNG BÁO
        </Line>
        <Line
          baseline={133.0}
          left={BODY_LEFT}
          width={BODY_RIGHT - BODY_LEFT}
          align="center"
          tracking={TITLE_TRACKING}
          style={styles.bold}
        >
          HOÀN THIỆN THỦ TỤC NHẬP HỌC
        </Line>
        <Line
          baseline={149.1}
          left={BODY_LEFT}
          width={BODY_RIGHT - BODY_LEFT}
          align="center"
          tracking={TITLE_TRACKING}
          style={styles.bold}
        >
          CHƯƠNG TRÌNH CỬ NHÂN TRỰC TUYẾN TỪ XA
        </Line>
        <Line
          baseline={171.2}
          left={BODY_LEFT}
          width={BODY_RIGHT - BODY_LEFT}
          align="center"
          tracking={TITLE_TRACKING}
        >
          Khóa khai giảng: Tháng {data.intake}
        </Line>

        <Paragraph baseline={193.3} indent={0} pitch={16.2}>
          Thông báo đến Anh (Chị) đã hoàn thiện hồ sơ đăng ký xét tuyển nhập
          học, cụ thể như sau:
        </Paragraph>

        {/* Student details */}
        <Line
          baseline={226.0}
          left={FIELD_LEFT}
          width={FIELD_RIGHT_COLUMN - FIELD_LEFT}
        >
          Họ và Tên:<Text style={styles.bold}> {data.fullName}</Text>
        </Line>
        <Line baseline={226.0} left={FIELD_RIGHT_COLUMN}>
          Địa điểm thi:<Text style={styles.bold}> {data.examLocation}</Text>
        </Line>
        <Line
          baseline={243.9}
          left={FIELD_LEFT}
          width={FIELD_RIGHT_COLUMN - FIELD_LEFT}
        >
          Sinh ngày :
          <Text style={styles.bold}>{formatNoticeDate(data.dateOfBirth)}</Text>
        </Line>
        <Line baseline={243.9} left={FIELD_RIGHT_COLUMN}>
          Đối tượng:<Text style={styles.bold}> {data.admissionGroup}</Text>
        </Line>
        <Line baseline={261.5} left={FIELD_LEFT}>
          Ngành đăng ký:<Text style={styles.bold}> {data.major}</Text>
        </Line>

        {/* 1. Fees */}
        <Line baseline={278.1} left={SECTION_LEFT} style={styles.bold}>
          1. Lệ phí xét tuyển và học phí:
        </Line>
        <Paragraph baseline={294.2}>
          - Nhà trường tiến hành tạm thu học phí đợt 1 đối với sinh viên tham
          gia chương trình đào tạo Cử nhân trực tuyến từ xa, khóa Tháng{" "}
          {data.intake}.
        </Paragraph>
        <Line baseline={326.3} left={64.9}>
          - {data.credits} tín chỉ x {formatNoticeAmount(data.creditFee)} đ/tín
          chỉ
        </Line>
        <Line baseline={326.3} left={AMOUNT_LEFT}>
          {formatNoticeAmount(amounts.tuition)}đ
        </Line>
        <Line baseline={342.4} left={64.9}>
          - Phí làm thẻ sinh viên:
        </Line>
        <Line baseline={342.4} left={AMOUNT_LEFT}>
          {formatNoticeAmount(settings.studentCardFee)}đ/thẻ
        </Line>
        <Line baseline={358.5} left={64.9}>
          -<Text style={styles.bold}> Tổng:</Text>
        </Line>
        <Line baseline={358.5} left={AMOUNT_LEFT} style={styles.bold}>
          {formatNoticeAmount(amounts.total)}đ
        </Line>

        {/* Payment */}
        <Line baseline={374.7} left={DETAIL_LEFT} style={styles.boldItalic}>
          Nộp qua hình thức chuyển khoản đến số tài khoản sau:
        </Line>
        <Line baseline={390.8} left={DETAIL_LEFT}>
          - Tên TK: {bank.accountName} Số TK: {bank.accountNumber}
        </Line>
        <Line baseline={406.9} left={BODY_LEFT}>
          tại Ngân hàng {bank.bankName} – Chi nhánh {bank.branchName}.
        </Line>
        <Line baseline={422.9} left={DETAIL_LEFT}>
          - Cú pháp:
          <Text style={styles.bold}>
            {" "}
            {data.paymentCode} + {settings.paymentSyntaxSuffix}
          </Text>
        </Line>
        <Line baseline={439.0} left={DETAIL_LEFT} style={styles.boldItalic}>
          Lưu ý :
        </Line>
        <Line baseline={455.1} left={DETAIL_LEFT} style={styles.italic}>
          * Số điện thoại đủ 10 số, Họ tên viết cách không viết liền
        </Line>
        <Paragraph baseline={471.3} style={styles.italic}>
          * Anh/Chị chỉ được cấp mã để đăng nhập vào hệ thống học tập sau khi
          nộp học phí đợt 1.
        </Paragraph>
        <Paragraph baseline={503.5} style={styles.italic}>
          * Khi nộp học phí, Anh/Chị vui lòng chụp ảnh màn hình giao dịch gửi
          cho cán bộ tư vấn để lưu trữ thông tin chuyển khoản.
        </Paragraph>

        {/* 2–3. Deadline and notes */}
        <Line baseline={535.6} left={SECTION_LEFT} style={styles.bold}>
          2. Thời hạn nộp: Đến hết ngày {formatNoticeDate(data.paymentDeadline)}
        </Line>
        <Line baseline={551.7} left={SECTION_LEFT} style={styles.bold}>
          3. Một số điểm cần lưu ý
        </Line>
        <Paragraph baseline={567.9}>
          - Anh (Chị) có trách nhiệm hoàn thiện thủ tục nhập học trong thời gian
          quy định. Nếu không hoàn thiện trong thời gian trên, Anh (Chị) sẽ
          không được tiếp tục theo học khóa này.
        </Paragraph>
        <Paragraph baseline={616.1}>
          - Đề nghị Anh (Chị) liên hệ trực tiếp với Chuyên viên Tư vấn tuyển
          sinh của mình để được giải đáp thông tin trong trường hợp cần hỗ trợ.
        </Paragraph>
        <Line baseline={648.3} left={109.4}>
          Trân trọng!
        </Line>

        <PlacedImage source={assets.signature} placement={layout.signature} />
        <PlacedImage source={assets.qrCode} placement={layout.qrCode} />

        {/* Footer on a white band, as in the original */}
        <View
          style={{
            position: "absolute",
            left: 22.7,
            top: 778.1,
            width: 581.3 - 22.7,
            height: 791.9 - 778.1,
            backgroundColor: "#FFFFFF",
          }}
        />
        <Line
          baseline={789.3}
          left={122.5}
          size={FOOTER_SIZE}
          tracking={0}
          style={{ color: "#050505" }}
        >
          Hotline: {settings.hotline}. Địa chỉ: {settings.address}.
        </Line>

        {/* The stamp is printed last so it overlaps the header, as on paper. */}
        <PlacedImage source={assets.stamp} placement={layout.stamp} />
      </Page>
    </Document>
  );
}
