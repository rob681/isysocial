-- ─── Deduplicate ClientSocialNetwork rows ───────────────────────────────────
-- Problem: The previous unique constraint was @@unique([clientId, network, pageId])
-- which allowed multiple rows per (clientId, network) if pageId differed.
-- This caused:
--   (1) Client cards showing duplicate badges ("Facebook Facebook Instagram Instagram")
--   (2) Publishing flows that iterate networkIds publishing the same post multiple times
--
-- Fix:
--   (1) Consolidate duplicates: keep the most recently assigned row with a valid access token
--       (fallback to most recently assigned overall if no row has a token).
--   (2) Drop the old constraint and recreate it as @@unique([clientId, network]).
-- ─────────────────────────────────────────────────────────────────────────────

SET search_path TO isysocial;

-- Step 1: For each (clientId, network) pair with duplicates, find the "winner":
--   - Prefer rows with non-null accessToken
--   - Among those, prefer the most recently assigned (assignedAt DESC)
WITH ranked AS (
  SELECT
    id,
    "clientId",
    network,
    ROW_NUMBER() OVER (
      PARTITION BY "clientId", network
      ORDER BY
        CASE WHEN "accessToken" IS NOT NULL AND "accessToken" <> '' THEN 0 ELSE 1 END,
        "token_expired" ASC,
        "assignedAt" DESC,
        "createdAt" DESC
    ) AS rn
  FROM "iso_client_social_networks"
),
losers AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM "iso_client_social_networks"
WHERE id IN (SELECT id FROM losers);

-- Step 2: Drop the old unique constraint and recreate it
-- Prisma names the constraint after the fields, so we drop the exact name
ALTER TABLE "iso_client_social_networks"
  DROP CONSTRAINT IF EXISTS "iso_client_social_networks_clientId_network_pageId_key";

ALTER TABLE "iso_client_social_networks"
  ADD CONSTRAINT "iso_client_social_networks_clientId_network_key"
  UNIQUE ("clientId", network);
