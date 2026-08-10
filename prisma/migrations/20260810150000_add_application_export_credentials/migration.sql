CREATE TABLE "application_export_credentials" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "application_id" UUID NOT NULL,
  "secret_hash" VARCHAR(64) NOT NULL,
  "failed_attempts" SMALLINT NOT NULL DEFAULT 0,
  "locked_until" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "application_export_credentials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_application_export_credentials_application" UNIQUE ("application_id"),
  CONSTRAINT "chk_application_export_credentials_secret_hash"
    CHECK ("secret_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "chk_application_export_credentials_failed_attempts"
    CHECK ("failed_attempts" >= 0),
  CONSTRAINT "fk_application_export_credentials_application"
    FOREIGN KEY ("application_id") REFERENCES "applications"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_application_export_credentials_locked_until"
  ON "application_export_credentials"("locked_until");
