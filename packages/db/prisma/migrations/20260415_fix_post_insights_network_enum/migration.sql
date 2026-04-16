-- Fix PostInsights.network column type from TEXT to SocialNetwork enum
SET search_path TO isysocial;

-- ─────────────────────────────────────────────────────────────────────────────
-- Alter the network column to use the SocialNetwork enum type
-- This assumes all existing values in network are valid enum values
-- ─────────────────────────────────────────────────────────────────────────────

-- Convert the column type from TEXT to SocialNetwork enum
ALTER TABLE "iso_post_insights"
  ALTER COLUMN "network" TYPE "SocialNetwork" USING "network"::"SocialNetwork";
