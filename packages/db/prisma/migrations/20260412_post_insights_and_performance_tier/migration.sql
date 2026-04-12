-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 3 + 4: PostInsights, PerformanceTier, Post.purpose
-- ─────────────────────────────────────────────────────────────────────────────

SET search_path TO isysocial;

-- ── PerformanceTier enum ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "PerformanceTier" AS ENUM ('TOP', 'HIGH', 'AVERAGE', 'LOW');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── Post: purpose + performance fields ───────────────────────────────────────
ALTER TABLE "iso_posts"
  ADD COLUMN IF NOT EXISTS "purpose"               TEXT,
  ADD COLUMN IF NOT EXISTS "performanceTier"        "PerformanceTier",
  ADD COLUMN IF NOT EXISTS "performanceTierSource"  TEXT,
  ADD COLUMN IF NOT EXISTS "performanceComputedAt"  TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "markedTopBy"            TEXT,
  ADD COLUMN IF NOT EXISTS "markedTopAt"            TIMESTAMP;

-- Index for performance tier queries (percentile computation by client+network)
CREATE INDEX IF NOT EXISTS "iso_posts_clientId_network_performanceTier_idx"
  ON "iso_posts"("clientId", "network", "performanceTier");

-- ── PostInsights table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "iso_post_insights" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "postId"         TEXT NOT NULL,
  "agencyId"       TEXT NOT NULL,
  "clientId"       TEXT NOT NULL,
  "network"        TEXT NOT NULL,
  "fetchedAt"      TIMESTAMP NOT NULL DEFAULT NOW(),
  "postAgeHours"   INTEGER NOT NULL,
  "impressions"    INTEGER NOT NULL DEFAULT 0,
  "reach"          INTEGER NOT NULL DEFAULT 0,
  "likes"          INTEGER NOT NULL DEFAULT 0,
  "comments"       INTEGER NOT NULL DEFAULT 0,
  "saved"          INTEGER NOT NULL DEFAULT 0,
  "shares"         INTEGER NOT NULL DEFAULT 0,
  "plays"          INTEGER NOT NULL DEFAULT 0,
  "engagementRate" DECIMAL(8,6),
  "rawData"        JSONB,
  "fetchSuccess"   BOOLEAN NOT NULL DEFAULT TRUE,
  "fetchError"     TEXT,
  CONSTRAINT "iso_post_insights_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "iso_posts"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "iso_post_insights_postId_fetchedAt_idx"
  ON "iso_post_insights"("postId", "fetchedAt" DESC);

CREATE INDEX IF NOT EXISTS "iso_post_insights_clientId_network_fetchedAt_idx"
  ON "iso_post_insights"("clientId", "network", "fetchedAt");

CREATE INDEX IF NOT EXISTS "iso_post_insights_agencyId_fetchedAt_idx"
  ON "iso_post_insights"("agencyId", "fetchedAt");
