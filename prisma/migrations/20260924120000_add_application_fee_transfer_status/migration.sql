CREATE TYPE "application_fee_transfer_status" AS ENUM (
  'NOT_TRANSFERRED',
  'TRANSFERRED'
);

ALTER TABLE "applications"
  ADD COLUMN "application_fee_transfer_status" "application_fee_transfer_status"
    NOT NULL DEFAULT 'NOT_TRANSFERRED',
  ADD COLUMN "application_fee_transfer_reason" TEXT,
  ADD CONSTRAINT "chk_applications_fee_transfer_reason"
    CHECK (
      "application_fee_transfer_status" = 'NOT_TRANSFERRED'::"application_fee_transfer_status"
      OR "application_fee_transfer_reason" IS NULL
    );
