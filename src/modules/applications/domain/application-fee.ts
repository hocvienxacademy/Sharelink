export const APPLICATION_FEE_TRANSFER_STATUSES = [
  "NOT_TRANSFERRED",
  "TRANSFERRED",
] as const;

export type ApplicationFeeTransferStatus =
  (typeof APPLICATION_FEE_TRANSFER_STATUSES)[number];
