-- LOCAL/ISOLATED DATABASE CHANGE-SET ONLY.
-- Do not deploy this file to staging or production: this repository has no
-- deployable migration baseline and the database policy blocks that rollout.
-- Email remains contact data; its local-part is used only for legacy backfill.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Abort before changing the table when automatic backfill is ambiguous.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users
    WHERE btrim(split_part(email, '@', 1)) = ''
       OR length(btrim(split_part(email, '@', 1))) > 100
  ) THEN
    RAISE EXCEPTION 'Cannot backfill username: an email local-part is blank or exceeds 100 characters';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM users
    GROUP BY lower(btrim(split_part(email, '@', 1)))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot backfill username: duplicate case-insensitive email local-parts exist';
  END IF;
END
$$;

ALTER TABLE users ADD COLUMN username varchar(100);

UPDATE users
SET username = lower(btrim(split_part(email, '@', 1)));

ALTER TABLE users
  ALTER COLUMN username SET NOT NULL,
  ADD CONSTRAINT chk_users_username_not_blank CHECK (btrim(username) <> ''),
  ADD CONSTRAINT chk_users_username_canonical
    CHECK (username = lower(btrim(username)));

CREATE UNIQUE INDEX uq_users_username_lower
  ON users (lower(username::text));

COMMIT;
