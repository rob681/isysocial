-- ──────────────────────────────────────────────────────────────────────────────
-- Security: Account Lockout + MFA fields (Isysocial)
-- ──────────────────────────────────────────────────────────────────────────────

SET search_path TO isysocial;

-- Account lockout: track failed login attempts
ALTER TABLE "iso_users"
  ADD COLUMN IF NOT EXISTS "loginAttempts"  INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockedUntil"    TIMESTAMP;

-- MFA / TOTP: optional two-factor auth for admins
ALTER TABLE "iso_users"
  ADD COLUMN IF NOT EXISTS "mfaEnabled"  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "totpSecret"  TEXT;

-- ──────────────────────────────────────────────────────────────────────────────
-- Audit Log
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "iso_audit_logs" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "agencyId"   TEXT,
  "userId"     TEXT,
  "action"     TEXT NOT NULL,
  "entityType" TEXT,
  "entityId"   TEXT,
  "oldValue"   JSONB,
  "newValue"   JSONB,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "iso_audit_logs_agencyId_idx"  ON "iso_audit_logs"("agencyId");
CREATE INDEX IF NOT EXISTS "iso_audit_logs_userId_idx"    ON "iso_audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "iso_audit_logs_action_idx"    ON "iso_audit_logs"("action");
CREATE INDEX IF NOT EXISTS "iso_audit_logs_createdAt_idx" ON "iso_audit_logs"("createdAt");
