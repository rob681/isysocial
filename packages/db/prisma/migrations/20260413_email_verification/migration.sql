-- ──────────────────────────────────────────────────────────────────────────────
-- Email Verification (Isysocial)
-- ──────────────────────────────────────────────────────────────────────────────

SET search_path TO isysocial;

ALTER TYPE "TokenType" ADD VALUE IF NOT EXISTS 'EMAIL_VERIFICATION';

ALTER TABLE "iso_users"
  ADD COLUMN IF NOT EXISTS "emailVerified"   BOOLEAN   NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP;

-- Mark existing users as verified (pre-feature)
UPDATE "iso_users"
SET "emailVerified" = TRUE, "emailVerifiedAt" = NOW()
WHERE "emailVerified" = FALSE;
