-- Baseline captured from the verified PostgreSQL schema on 2026-07-31.
-- It intentionally predates the timestamped username, application-fee, and
-- application-export-credential migrations that follow it.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "admission_qualification_type" AS ENUM ('THPT', 'TC', 'CD', 'DH');

-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('DRAFT', 'SUBMITTED', 'WAITING_PAYMENT', 'PAYMENT_CONFIRMED', 'NEEDS_REVISION', 'VALID', 'PRINTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "gender_type" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "registration_link_status" AS ENUM ('DRAFT', 'ACTIVE', 'LOCKED', 'SUBMITTED', 'EXPIRED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('SALE', 'MANAGER', 'ADMIN');

-- CreateTable
CREATE TABLE "admission_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admission_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_sessions" (
    "sid" VARCHAR(255) NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_sessions_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "application_relatives" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "position" SMALLINT NOT NULL,
    "full_name" VARCHAR(150),
    "relationship" VARCHAR(100),
    "occupation" VARCHAR(255),
    "phone" VARCHAR(15),
    "address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_relatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_status_histories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "previous_status" "application_status",
    "new_status" "application_status" NOT NULL,
    "changed_by" UUID,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "registration_link_id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "application_code" VARCHAR(50),
    "status" "application_status" NOT NULL DEFAULT 'DRAFT',
    "major_id" UUID,
    "admission_period_id" UUID,
    "entry_qualification" "admission_qualification_type",
    "full_name" VARCHAR(150),
    "gender" "gender_type",
    "date_of_birth" DATE,
    "place_of_birth" VARCHAR(255),
    "ethnicity" VARCHAR(100),
    "religion" VARCHAR(100),
    "nationality" VARCHAR(100) DEFAULT 'Việt Nam',
    "citizen_id" VARCHAR(20),
    "citizen_id_issued_date" DATE,
    "citizen_id_issued_place" VARCHAR(255),
    "permanent_address" TEXT,
    "workplace" TEXT,
    "phone" VARCHAR(15),
    "email" VARCHAR(255),
    "contact_address" TEXT,
    "admission_diploma" "admission_qualification_type",
    "graduate_major" VARCHAR(255),
    "graduation_year" SMALLINT,
    "high_school_name" VARCHAR(255),
    "high_school_ward" VARCHAR(255),
    "high_school_province" VARCHAR(255),
    "declaration_place" VARCHAR(255),
    "declaration_date" DATE,
    "declaration_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "data_processing_consent" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID,
    "old_values" JSONB,
    "new_values" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bank_code" VARCHAR(30) NOT NULL,
    "bank_name" VARCHAR(150) NOT NULL,
    "branch_name" VARCHAR(255),
    "account_number" VARCHAR(50) NOT NULL,
    "account_name" VARCHAR(255) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "majors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "majors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_confirmations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "bank_account_id" UUID,
    "bank_name" VARCHAR(150) NOT NULL,
    "bank_branch" VARCHAR(255),
    "account_number" VARCHAR(50) NOT NULL,
    "account_name" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(14,2),
    "transfer_content" VARCHAR(255) NOT NULL,
    "status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "confirmed_by" UUID,
    "confirmed_at" TIMESTAMPTZ(6),
    "confirmation_note" TEXT,
    "cancelled_by" UUID,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_link_status_histories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "registration_link_id" UUID NOT NULL,
    "previous_status" "registration_link_status",
    "new_status" "registration_link_status" NOT NULL,
    "changed_by" UUID,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_link_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_token" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sale_id" UUID NOT NULL,
    "created_by" UUID,
    "major_id" UUID,
    "admission_period_id" UUID,
    "student_name_hint" VARCHAR(150),
    "entry_qualification" "admission_qualification_type",
    "tuition_amount" DECIMAL(14,2),
    "payment_round" VARCHAR(50) DEFAULT 'D1',
    "internal_note" TEXT,
    "status" "registration_link_status" NOT NULL DEFAULT 'DRAFT',
    "expires_at" TIMESTAMPTZ(6),
    "activated_at" TIMESTAMPTZ(6),
    "locked_at" TIMESTAMPTZ(6),
    "locked_by" UUID,
    "submitted_at" TIMESTAMPTZ(6),
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "last_accessed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "setting_key" VARCHAR(100) NOT NULL,
    "setting_value" JSONB NOT NULL,
    "description" TEXT,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("setting_key")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(15),
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "manager_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),
    "password_changed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_admission_periods_code" ON "admission_periods"("code");

-- CreateIndex
CREATE INDEX "idx_app_sessions_expire" ON "app_sessions"("expire");

-- CreateIndex
CREATE UNIQUE INDEX "uq_application_relatives_position" ON "application_relatives"("application_id", "position");

-- CreateIndex
CREATE INDEX "idx_application_status_histories_application_created" ON "application_status_histories"("application_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_applications_registration_link" ON "applications"("registration_link_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_applications_application_code" ON "applications"("application_code");

-- CreateIndex
CREATE INDEX "idx_applications_citizen_id" ON "applications"("citizen_id") WHERE (citizen_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_applications_major" ON "applications"("major_id");

-- CreateIndex
CREATE INDEX "idx_applications_phone" ON "applications"("phone") WHERE (phone IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_applications_sale_status" ON "applications"("sale_id", "status");

-- CreateIndex
CREATE INDEX "idx_applications_submitted_at" ON "applications"("submitted_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_logs_action_created" ON "audit_logs"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_logs_actor_created" ON "audit_logs"("actor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity_created" ON "audit_logs"("entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_bank_accounts_default" ON "bank_accounts"("is_default") WHERE (is_default = true);

-- CreateIndex
CREATE UNIQUE INDEX "uq_bank_accounts" ON "bank_accounts"("bank_code", "account_number");

-- CreateIndex
CREATE UNIQUE INDEX "uq_majors_code" ON "majors"("code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_payment_confirmations_application" ON "payment_confirmations"("application_id");

-- CreateIndex
CREATE INDEX "idx_payment_confirmations_confirmed_at" ON "payment_confirmations"("confirmed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_payment_confirmations_status" ON "payment_confirmations"("status");

-- CreateIndex
CREATE INDEX "idx_link_status_histories_link_created" ON "registration_link_status_histories"("registration_link_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_registration_links_public_token" ON "registration_links"("public_token");

-- CreateIndex
CREATE INDEX "idx_registration_links_admission_period" ON "registration_links"("admission_period_id");

-- CreateIndex
CREATE INDEX "idx_registration_links_major" ON "registration_links"("major_id");

-- CreateIndex
CREATE INDEX "idx_registration_links_sale_status" ON "registration_links"("sale_id", "status");

-- CreateIndex
CREATE INDEX "idx_registration_links_status_expiry" ON "registration_links"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_phone" ON "users"("phone") WHERE (phone IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_users_manager" ON "users"("manager_id");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- AddForeignKey
ALTER TABLE "application_relatives" ADD CONSTRAINT "fk_application_relatives_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_status_histories" ADD CONSTRAINT "fk_application_status_histories_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_status_histories" ADD CONSTRAINT "fk_application_status_histories_changed_by" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "fk_applications_admission_period" FOREIGN KEY ("admission_period_id") REFERENCES "admission_periods"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "fk_applications_major" FOREIGN KEY ("major_id") REFERENCES "majors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "fk_applications_registration_link" FOREIGN KEY ("registration_link_id") REFERENCES "registration_links"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "fk_applications_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "fk_applications_sale" FOREIGN KEY ("sale_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "fk_audit_logs_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "fk_payment_confirmations_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "fk_payment_confirmations_bank_account" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "fk_payment_confirmations_cancelled_by" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "fk_payment_confirmations_confirmed_by" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "registration_link_status_histories" ADD CONSTRAINT "fk_link_status_histories_changed_by" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "registration_link_status_histories" ADD CONSTRAINT "fk_link_status_histories_link" FOREIGN KEY ("registration_link_id") REFERENCES "registration_links"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "registration_links" ADD CONSTRAINT "fk_registration_links_admission_period" FOREIGN KEY ("admission_period_id") REFERENCES "admission_periods"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "registration_links" ADD CONSTRAINT "fk_registration_links_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "registration_links" ADD CONSTRAINT "fk_registration_links_locked_by" FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "registration_links" ADD CONSTRAINT "fk_registration_links_major" FOREIGN KEY ("major_id") REFERENCES "majors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "registration_links" ADD CONSTRAINT "fk_registration_links_sale" FOREIGN KEY ("sale_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "fk_system_settings_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "fk_users_manager" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- PostgreSQL CHECK constraints introspected from the source database. Prisma
-- does not currently emit these from schema.prisma.
ALTER TABLE "admission_periods"
  ADD CONSTRAINT "chk_admission_period_dates"
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);

ALTER TABLE "application_relatives"
  ADD CONSTRAINT "chk_application_relatives_phone"
  CHECK (phone IS NULL OR phone::text ~ '^[0-9]{10,15}$'::text),
  ADD CONSTRAINT "chk_application_relatives_position"
  CHECK ("position" >= 1 AND "position" <= 2);

ALTER TABLE "applications"
  ADD CONSTRAINT "chk_applications_citizen_id"
  CHECK (citizen_id IS NULL OR citizen_id::text ~ '^[0-9]{9,12}$'::text),
  ADD CONSTRAINT "chk_applications_graduation_year"
  CHECK (graduation_year IS NULL OR graduation_year >= 1950 AND graduation_year <= 2100),
  ADD CONSTRAINT "chk_applications_phone"
  CHECK (phone IS NULL OR phone::text ~ '^[0-9]{10}$'::text),
  ADD CONSTRAINT "chk_applications_version"
  CHECK (version >= 1);

ALTER TABLE "majors"
  ADD CONSTRAINT "chk_majors_display_order"
  CHECK (display_order >= 0);

ALTER TABLE "payment_confirmations"
  ADD CONSTRAINT "chk_payment_cancelled_fields"
  CHECK (status <> 'CANCELLED'::payment_status OR cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL),
  ADD CONSTRAINT "chk_payment_confirmations_amount"
  CHECK (amount IS NULL OR amount >= 0::numeric),
  ADD CONSTRAINT "chk_payment_confirmed_fields"
  CHECK (status <> 'CONFIRMED'::payment_status OR confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL);

ALTER TABLE "registration_links"
  ADD CONSTRAINT "chk_registration_links_access_count"
  CHECK (access_count >= 0),
  ADD CONSTRAINT "chk_registration_links_expiry"
  CHECK (expires_at IS NULL OR expires_at > created_at),
  ADD CONSTRAINT "chk_registration_links_tuition"
  CHECK (tuition_amount IS NULL OR tuition_amount >= 0::numeric);

ALTER TABLE "users"
  ADD CONSTRAINT "chk_users_failed_login_attempts"
  CHECK (failed_login_attempts >= 0),
  ADD CONSTRAINT "chk_users_not_own_manager"
  CHECK (manager_id IS NULL OR manager_id <> id),
  ADD CONSTRAINT "chk_users_phone"
  CHECK (phone IS NULL OR phone::text ~ '^[0-9]{10,15}$'::text);

-- Expression indexes introspected from the source database.
CREATE INDEX "idx_applications_full_name_lower"
  ON "applications" (lower(full_name::text))
  WHERE full_name IS NOT NULL;
CREATE UNIQUE INDEX "uq_majors_name_lower"
  ON "majors" (lower(name::text));
CREATE UNIQUE INDEX "uq_users_email_lower"
  ON "users" (lower(email::text));

-- Database comments introspected from the source database.
COMMENT ON TABLE "applications" IS 'Hồ sơ sinh viên nhập từ link đăng ký';
COMMENT ON TABLE "audit_logs" IS 'Nhật ký thao tác phục vụ truy vết nội bộ';
COMMENT ON TABLE "payment_confirmations" IS 'Xác nhận chuyển khoản ngoài hệ thống; không lưu ảnh giao dịch';
COMMENT ON TABLE "registration_links" IS 'Link công khai do sale tạo và quản lý trạng thái';
COMMENT ON COLUMN "registration_links"."public_token" IS 'Token ngẫu nhiên dùng trong URL công khai gửi cho sinh viên';
