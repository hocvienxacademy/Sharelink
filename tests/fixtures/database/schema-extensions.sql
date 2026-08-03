-- Objects verified from the local source database metadata on 2026-07-31.
-- Prisma's schema diff creates the portable base DDL; these are PostgreSQL
-- objects that Prisma introspection does not fully represent.

ALTER TABLE admission_periods
  ADD CONSTRAINT chk_admission_period_dates
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);

ALTER TABLE application_relatives
  ADD CONSTRAINT chk_application_relatives_phone
  CHECK (phone IS NULL OR phone::text ~ '^[0-9]{10,15}$'::text),
  ADD CONSTRAINT chk_application_relatives_position
  CHECK ("position" >= 1 AND "position" <= 2);

ALTER TABLE applications
  ADD CONSTRAINT chk_applications_citizen_id
  CHECK (citizen_id IS NULL OR citizen_id::text ~ '^[0-9]{9,12}$'::text),
  ADD CONSTRAINT chk_applications_graduation_year
  CHECK (graduation_year IS NULL OR graduation_year >= 1950 AND graduation_year <= 2100),
  ADD CONSTRAINT chk_applications_phone
  CHECK (phone IS NULL OR phone::text ~ '^[0-9]{10}$'::text),
  ADD CONSTRAINT chk_applications_version
  CHECK (version >= 1);

ALTER TABLE majors
  ADD CONSTRAINT chk_majors_display_order CHECK (display_order >= 0);

ALTER TABLE payment_confirmations
  ADD CONSTRAINT chk_payment_cancelled_fields
  CHECK (status <> 'CANCELLED'::payment_status OR cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL),
  ADD CONSTRAINT chk_payment_confirmations_amount
  CHECK (amount IS NULL OR amount >= 0::numeric),
  ADD CONSTRAINT chk_payment_confirmed_fields
  CHECK (status <> 'CONFIRMED'::payment_status OR confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL);

ALTER TABLE registration_links
  ADD CONSTRAINT chk_registration_links_access_count CHECK (access_count >= 0),
  ADD CONSTRAINT chk_registration_links_expiry
  CHECK (expires_at IS NULL OR expires_at > created_at),
  ADD CONSTRAINT chk_registration_links_tuition
  CHECK (tuition_amount IS NULL OR tuition_amount >= 0::numeric);

ALTER TABLE users
  ADD CONSTRAINT chk_users_failed_login_attempts CHECK (failed_login_attempts >= 0),
  ADD CONSTRAINT chk_users_not_own_manager CHECK (manager_id IS NULL OR manager_id <> id),
  ADD CONSTRAINT chk_users_username_not_blank CHECK (btrim(username) <> ''),
  ADD CONSTRAINT chk_users_username_canonical CHECK (username = lower(btrim(username))),
  ADD CONSTRAINT chk_users_phone
  CHECK (phone IS NULL OR phone::text ~ '^[0-9]{10,15}$'::text);

CREATE INDEX idx_applications_full_name_lower
  ON applications (lower(full_name::text))
  WHERE full_name IS NOT NULL;
CREATE UNIQUE INDEX uq_majors_name_lower ON majors (lower(name::text));
CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email::text));
CREATE UNIQUE INDEX uq_users_username_lower ON users (lower(username::text));
