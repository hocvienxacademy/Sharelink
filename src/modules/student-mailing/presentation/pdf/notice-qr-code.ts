import QRCode from "qrcode";

/**
 * Renders `url` as a PNG data URI for the notice's QR code layer. Matches the
 * final PDF: version 3 (29 × 29 modules) with the standard 4-module quiet zone.
 */
export function createNoticeQrCode(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 4,
    width: 640,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}
