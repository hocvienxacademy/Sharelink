CREATE TYPE "submission_email_status" AS ENUM (
  'NOT_SENT',
  'PENDING',
  'SENT',
  'FAILED'
);

ALTER TABLE "applications"
  ADD COLUMN "submission_email_status" "submission_email_status"
  NOT NULL DEFAULT 'NOT_SENT';
