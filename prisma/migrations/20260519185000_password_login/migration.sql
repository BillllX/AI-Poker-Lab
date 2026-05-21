DROP INDEX IF EXISTS "users_email_key";

ALTER TABLE "users"
  DROP COLUMN IF EXISTS "email",
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
