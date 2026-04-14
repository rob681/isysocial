-- ─── Isysocial: Email Verification Enum Values + Rate Limit Records ───────────

-- Add EMAIL_VERIFICATION and MFA_SETUP to TokenType enum
ALTER TYPE isysocial."TokenType" ADD VALUE IF NOT EXISTS 'EMAIL_VERIFICATION';
ALTER TYPE isysocial."TokenType" ADD VALUE IF NOT EXISTS 'MFA_SETUP';

-- Create rate limit records table for DB-backed rate limiting
CREATE TABLE IF NOT EXISTS isysocial.iso_rate_limit_records (
  id          TEXT        NOT NULL,
  key         TEXT        NOT NULL,
  count       INTEGER     NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT iso_rate_limit_records_pkey PRIMARY KEY (id),
  CONSTRAINT iso_rate_limit_records_key_key UNIQUE (key)
);

CREATE INDEX IF NOT EXISTS iso_rate_limit_records_expires_idx
  ON isysocial.iso_rate_limit_records ("expiresAt");
