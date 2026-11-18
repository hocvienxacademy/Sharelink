-- Student mailing: procedure emails (TBHTTTNH, HĐHPĐ1), generated notices,
-- invoice files and full send tracing. Additive only: no existing table,
-- column or constraint is changed. Rollback: drop the new tables and enums
-- (application-only data; nothing else references them).

-- CreateEnum
CREATE TYPE "mail_procedure" AS ENUM ('ENROLLMENT_NOTICE', 'TUITION_INVOICE');

-- CreateEnum
CREATE TYPE "mail_batch_status" AS ENUM ('DRAFT', 'SENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "mail_message_kind" AS ENUM ('DELIVERY', 'TEST');

-- CreateEnum
CREATE TYPE "mail_message_status" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "notice_asset_slot" AS ENUM ('WATERMARK', 'STAMP', 'SIGNATURE');

-- CreateTable
CREATE TABLE "notice_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slot" "notice_asset_slot" NOT NULL,
    "content" BYTEA NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notice_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "procedure" "mail_procedure" NOT NULL,
    "version" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "settings" JSONB NOT NULL,
    "layout" JSONB NOT NULL,
    "watermark_asset_id" UUID,
    "stamp_asset_id" UUID,
    "signature_asset_id" UUID,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notice_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "procedure" "mail_procedure" NOT NULL,
    "version" INTEGER NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "body_html" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "procedure" "mail_procedure" NOT NULL,
    "source_file_name" VARCHAR(255) NOT NULL,
    "status" "mail_batch_status" NOT NULL DEFAULT 'DRAFT',
    "sender_id" UUID NOT NULL,
    "notice_template_id" UUID,
    "email_template_id" UUID,
    "email_subject" VARCHAR(255) NOT NULL,
    "email_body_html" TEXT NOT NULL,
    "confirmed_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_batch_recipients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(15),
    "class_code" VARCHAR(50),
    "notice_data" JSONB,
    "application_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_batch_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "mail_message_kind" NOT NULL,
    "procedure" "mail_procedure" NOT NULL,
    "batch_id" UUID,
    "recipient_id" UUID,
    "to_email" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "sender_id" UUID NOT NULL,
    "status" "mail_message_status" NOT NULL DEFAULT 'QUEUED',
    "attempt_count" SMALLINT NOT NULL DEFAULT 0,
    "last_error_code" VARCHAR(100),
    "smtp_message_id" VARCHAR(255),
    "resend_of_id" UUID,
    "resend_reason" TEXT,
    "queued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_id" UUID NOT NULL,
    "notice_template_id" UUID NOT NULL,
    "input_data" JSONB NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "content" BYTEA,
    "expires_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (CURRENT_TIMESTAMP + '3 mons'::interval),
    "purged_at" TIMESTAMPTZ(6),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "original_file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "content" BYTEA,
    "expires_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (CURRENT_TIMESTAMP + '3 mons'::interval),
    "purged_at" TIMESTAMPTZ(6),
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_id" UUID NOT NULL,
    "invoice_file_id" UUID NOT NULL,
    "assigned_by" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_by" UUID,
    "unassigned_at" TIMESTAMPTZ(6),

    CONSTRAINT "invoice_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_message_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "document_id" UUID,
    "invoice_file_id" UUID,
    "file_name" VARCHAR(255) NOT NULL,
    "sha256" CHAR(64) NOT NULL,

    CONSTRAINT "mail_message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_notice_assets_slot_sha256" ON "notice_assets"("slot", "sha256");

-- CreateIndex
CREATE UNIQUE INDEX "uq_notice_templates_procedure_version" ON "notice_templates"("procedure", "version");

-- CreateIndex
CREATE UNIQUE INDEX "uq_notice_templates_default" ON "notice_templates"("procedure") WHERE (is_default);

-- CreateIndex
CREATE UNIQUE INDEX "uq_email_templates_procedure_version" ON "email_templates"("procedure", "version");

-- CreateIndex
CREATE UNIQUE INDEX "uq_email_templates_default" ON "email_templates"("procedure") WHERE (is_default);

-- CreateIndex
CREATE INDEX "idx_mail_batches_sender_created" ON "mail_batches"("sender_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_mail_batches_status" ON "mail_batches"("status");

-- CreateIndex
CREATE INDEX "idx_mail_batch_recipients_email" ON "mail_batch_recipients"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uq_mail_batch_recipients_batch_row" ON "mail_batch_recipients"("batch_id", "row_number");

-- CreateIndex
CREATE INDEX "idx_mail_messages_batch_status" ON "mail_messages"("batch_id", "status");

-- CreateIndex
CREATE INDEX "idx_mail_messages_queue" ON "mail_messages"("status", "queued_at") WHERE (status = ANY (ARRAY['QUEUED'::mail_message_status, 'SENDING'::mail_message_status]));

-- CreateIndex
CREATE UNIQUE INDEX "uq_mail_messages_first_delivery" ON "mail_messages"("recipient_id") WHERE ((kind = 'DELIVERY'::mail_message_kind) AND (resend_of_id IS NULL));

-- CreateIndex
CREATE INDEX "idx_mail_documents_recipient_created" ON "mail_documents"("recipient_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_mail_documents_expiry" ON "mail_documents"("expires_at") WHERE (content IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_invoice_files_batch" ON "invoice_files"("batch_id");

-- CreateIndex
CREATE INDEX "idx_invoice_files_expiry" ON "invoice_files"("expires_at") WHERE (content IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "uq_invoice_assignments_active_recipient" ON "invoice_assignments"("recipient_id") WHERE (unassigned_at IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "uq_invoice_assignments_active_file" ON "invoice_assignments"("invoice_file_id") WHERE (unassigned_at IS NULL);

-- CreateIndex
CREATE INDEX "idx_mail_message_attachments_message" ON "mail_message_attachments"("message_id");

-- AddForeignKey
ALTER TABLE "notice_assets" ADD CONSTRAINT "fk_notice_assets_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notice_templates" ADD CONSTRAINT "fk_notice_templates_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notice_templates" ADD CONSTRAINT "fk_notice_templates_watermark_asset" FOREIGN KEY ("watermark_asset_id") REFERENCES "notice_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notice_templates" ADD CONSTRAINT "fk_notice_templates_stamp_asset" FOREIGN KEY ("stamp_asset_id") REFERENCES "notice_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notice_templates" ADD CONSTRAINT "fk_notice_templates_signature_asset" FOREIGN KEY ("signature_asset_id") REFERENCES "notice_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "fk_email_templates_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mail_batches" ADD CONSTRAINT "fk_mail_batches_sender" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mail_batches" ADD CONSTRAINT "fk_mail_batches_notice_template" FOREIGN KEY ("notice_template_id") REFERENCES "notice_templates"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mail_batches" ADD CONSTRAINT "fk_mail_batches_email_template" FOREIGN KEY ("email_template_id") REFERENCES "email_templates"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mail_batch_recipients" ADD CONSTRAINT "fk_mail_batch_recipients_batch" FOREIGN KEY ("batch_id") REFERENCES "mail_batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mail_batch_recipients" ADD CONSTRAINT "fk_mail_batch_recipients_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mail_messages" ADD CONSTRAINT "fk_mail_messages_batch" FOREIGN KEY ("batch_id") REFERENCES "mail_batches"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mail_messages" ADD CONSTRAINT "fk_mail_messages_recipient" FOREIGN KEY ("recipient_id") REFERENCES "mail_batch_recipients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mail_messages" ADD CONSTRAINT "fk_mail_messages_sender" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mail_messages" ADD CONSTRAINT "fk_mail_messages_resend_of" FOREIGN KEY ("resend_of_id") REFERENCES "mail_messages"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mail_documents" ADD CONSTRAINT "fk_mail_documents_recipient" FOREIGN KEY ("recipient_id") REFERENCES "mail_batch_recipients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mail_documents" ADD CONSTRAINT "fk_mail_documents_notice_template" FOREIGN KEY ("notice_template_id") REFERENCES "notice_templates"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mail_documents" ADD CONSTRAINT "fk_mail_documents_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_files" ADD CONSTRAINT "fk_invoice_files_batch" FOREIGN KEY ("batch_id") REFERENCES "mail_batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_files" ADD CONSTRAINT "fk_invoice_files_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_assignments" ADD CONSTRAINT "fk_invoice_assignments_recipient" FOREIGN KEY ("recipient_id") REFERENCES "mail_batch_recipients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_assignments" ADD CONSTRAINT "fk_invoice_assignments_invoice_file" FOREIGN KEY ("invoice_file_id") REFERENCES "invoice_files"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_assignments" ADD CONSTRAINT "fk_invoice_assignments_assigned_by" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_assignments" ADD CONSTRAINT "fk_invoice_assignments_unassigned_by" FOREIGN KEY ("unassigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mail_message_attachments" ADD CONSTRAINT "fk_mail_message_attachments_message" FOREIGN KEY ("message_id") REFERENCES "mail_messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mail_message_attachments" ADD CONSTRAINT "fk_mail_message_attachments_document" FOREIGN KEY ("document_id") REFERENCES "mail_documents"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mail_message_attachments" ADD CONSTRAINT "fk_mail_message_attachments_invoice_file" FOREIGN KEY ("invoice_file_id") REFERENCES "invoice_files"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;


-- ---------------------------------------------------------------------------
-- CHECK constraints (not representable in the Prisma schema). Names must stay
-- in sync with scripts/database/verify-migration-chain.ts,
-- scripts/database/verify-staging-schema.ts and
-- tests/integration/database/check-constraints.test.ts.
-- ---------------------------------------------------------------------------

ALTER TABLE "notice_assets"
  ADD CONSTRAINT "chk_notice_assets_mime_type"
    CHECK ("mime_type" IN ('image/png', 'image/jpeg')),
  ADD CONSTRAINT "chk_notice_assets_sha256"
    CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "chk_notice_assets_byte_size"
    CHECK ("byte_size" > 0 AND "byte_size" <= 5242880
           AND octet_length("content") = "byte_size");

ALTER TABLE "notice_templates"
  ADD CONSTRAINT "chk_notice_templates_version" CHECK ("version" >= 1),
  ADD CONSTRAINT "chk_notice_templates_name_not_blank" CHECK (btrim("name") <> ''),
  ADD CONSTRAINT "chk_notice_templates_json_objects"
    CHECK (jsonb_typeof("settings") = 'object' AND jsonb_typeof("layout") = 'object');

ALTER TABLE "email_templates"
  ADD CONSTRAINT "chk_email_templates_version" CHECK ("version" >= 1),
  ADD CONSTRAINT "chk_email_templates_subject_not_blank" CHECK (btrim("subject") <> '');

ALTER TABLE "mail_batches"
  ADD CONSTRAINT "chk_mail_batches_source_file_name_not_blank"
    CHECK (btrim("source_file_name") <> ''),
  ADD CONSTRAINT "chk_mail_batches_subject_not_blank"
    CHECK (btrim("email_subject") <> ''),
  -- Only notice batches use a notice template.
  ADD CONSTRAINT "chk_mail_batches_notice_template"
    CHECK ("procedure" = 'ENROLLMENT_NOTICE' OR "notice_template_id" IS NULL),
  ADD CONSTRAINT "chk_mail_batches_lifecycle"
    CHECK (
      ("status" = 'DRAFT' AND "confirmed_at" IS NULL AND "completed_at" IS NULL)
      OR ("status" = 'SENDING' AND "confirmed_at" IS NOT NULL AND "completed_at" IS NULL)
      OR ("status" = 'COMPLETED' AND "confirmed_at" IS NOT NULL AND "completed_at" IS NOT NULL)
      OR ("status" = 'CANCELLED' AND "completed_at" IS NULL)
    );

ALTER TABLE "mail_batch_recipients"
  ADD CONSTRAINT "chk_mail_batch_recipients_row_number" CHECK ("row_number" >= 1),
  ADD CONSTRAINT "chk_mail_batch_recipients_full_name_not_blank"
    CHECK (btrim("full_name") <> ''),
  ADD CONSTRAINT "chk_mail_batch_recipients_email"
    CHECK ("email" ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  ADD CONSTRAINT "chk_mail_batch_recipients_phone"
    CHECK ("phone" IS NULL OR "phone" ~ '^[0-9]{10}$'),
  ADD CONSTRAINT "chk_mail_batch_recipients_notice_data"
    CHECK ("notice_data" IS NULL OR jsonb_typeof("notice_data") = 'object');

ALTER TABLE "mail_messages"
  -- A delivery belongs to a batch row; a test send goes to the sender only.
  ADD CONSTRAINT "chk_mail_messages_kind_links"
    CHECK (
      ("kind" = 'DELIVERY' AND "batch_id" IS NOT NULL AND "recipient_id" IS NOT NULL)
      OR ("kind" = 'TEST' AND "recipient_id" IS NULL AND "resend_of_id" IS NULL)
    ),
  ADD CONSTRAINT "chk_mail_messages_to_email"
    CHECK ("to_email" ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  ADD CONSTRAINT "chk_mail_messages_attempt_count" CHECK ("attempt_count" >= 0),
  ADD CONSTRAINT "chk_mail_messages_sent_fields"
    CHECK (("status" = 'SENT') = ("sent_at" IS NOT NULL)),
  -- A resend must say why, and only a resend may have a reason. The explicit
  -- IS NOT NULL matters: btrim(NULL) <> '' is NULL, which a CHECK accepts.
  ADD CONSTRAINT "chk_mail_messages_resend"
    CHECK (
      ("resend_of_id" IS NULL AND "resend_reason" IS NULL)
      OR ("resend_of_id" IS NOT NULL AND "resend_reason" IS NOT NULL
          AND btrim("resend_reason") <> '')
    );

ALTER TABLE "mail_documents"
  ADD CONSTRAINT "chk_mail_documents_sha256" CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "chk_mail_documents_byte_size"
    CHECK ("byte_size" > 0 AND ("content" IS NULL OR octet_length("content") = "byte_size")),
  ADD CONSTRAINT "chk_mail_documents_purge"
    CHECK (("content" IS NULL) = ("purged_at" IS NOT NULL)),
  ADD CONSTRAINT "chk_mail_documents_expiry" CHECK ("expires_at" > "created_at"),
  ADD CONSTRAINT "chk_mail_documents_input_data"
    CHECK (jsonb_typeof("input_data") = 'object');

ALTER TABLE "invoice_files"
  ADD CONSTRAINT "chk_invoice_files_mime_type"
    CHECK ("mime_type" IN ('image/png', 'image/jpeg', 'application/pdf')),
  ADD CONSTRAINT "chk_invoice_files_sha256" CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "chk_invoice_files_byte_size"
    CHECK ("byte_size" > 0 AND "byte_size" <= 10485760
           AND ("content" IS NULL OR octet_length("content") = "byte_size")),
  ADD CONSTRAINT "chk_invoice_files_purge"
    CHECK (("content" IS NULL) = ("purged_at" IS NOT NULL)),
  ADD CONSTRAINT "chk_invoice_files_expiry" CHECK ("expires_at" > "created_at");

ALTER TABLE "invoice_assignments"
  ADD CONSTRAINT "chk_invoice_assignments_unassigned_fields"
    CHECK (
      ("unassigned_at" IS NULL AND "unassigned_by" IS NULL)
      OR ("unassigned_at" IS NOT NULL AND "unassigned_by" IS NOT NULL
          AND "unassigned_at" >= "assigned_at")
    );

ALTER TABLE "mail_message_attachments"
  ADD CONSTRAINT "chk_mail_message_attachments_source"
    CHECK (num_nonnulls("document_id", "invoice_file_id") = 1),
  ADD CONSTRAINT "chk_mail_message_attachments_sha256"
    CHECK ("sha256" ~ '^[0-9a-f]{64}$');

-- ---------------------------------------------------------------------------
-- Retention notes kept in the catalog for operators.
-- ---------------------------------------------------------------------------

COMMENT ON COLUMN "mail_documents"."content" IS
  'Generated notice PDF. Purged 3 months after creation (content set to NULL, purged_at set); metadata and sha256 are kept for tracing.';
COMMENT ON COLUMN "invoice_files"."content" IS
  'Invoice file from accounting, sent unchanged. Purged 3 months after upload (content set to NULL, purged_at set).';
COMMENT ON TABLE "mail_batches" IS
  'One Excel import and its send. The Excel file itself is never stored.';
