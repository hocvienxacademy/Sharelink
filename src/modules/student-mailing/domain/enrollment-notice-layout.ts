/**
 * Placement of the image layers on the A4 notice, in PDF points (1/72 inch)
 * from the top-left corner. Defaults are measured from the approved final PDF.
 */
export interface NoticeImagePlacement {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Degrees; negative turns counter-clockwise, around the image centre. */
  readonly rotation: number;
  readonly opacity: number;
  readonly visible: boolean;
}

export interface EnrollmentNoticeLayout {
  /** TVU logo printed faintly behind the text. */
  readonly watermark: NoticeImagePlacement;
  /** Red "TRUNG TÂM ĐÀO TẠO TRỰC TUYẾN TỪ XA" stamp over the header. */
  readonly stamp: NoticeImagePlacement;
  /** Initial signature under "Trân trọng!". */
  readonly signature: NoticeImagePlacement;
  /** QR code linking to the programme landing page. */
  readonly qrCode: NoticeImagePlacement;
}

const placement = (
  values: Pick<NoticeImagePlacement, "x" | "y" | "width" | "height"> &
    Partial<Pick<NoticeImagePlacement, "rotation" | "opacity">>,
): NoticeImagePlacement => ({
  rotation: 0,
  opacity: 1,
  visible: true,
  ...values,
});

export const DEFAULT_ENROLLMENT_NOTICE_LAYOUT: EnrollmentNoticeLayout = {
  watermark: placement({
    x: 80.04,
    y: 177.72,
    width: 472.32,
    height: 472.32,
    opacity: 0.18,
  }),
  // The final PDF rotates a 205 × 64.25 pt image by -35.4° around (139.94, 133.14).
  stamp: placement({
    x: 37.44,
    y: 101.02,
    width: 205,
    height: 64.25,
    rotation: -35.4,
  }),
  signature: placement({ x: 179.38, y: 657.78, width: 43.83, height: 43.83 }),
  qrCode: placement({ x: 408.96, y: 660.96, width: 80.64, height: 80.64 }),
};
