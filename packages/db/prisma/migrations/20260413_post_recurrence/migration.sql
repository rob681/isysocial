SET search_path TO isysocial;

-- Add sourceRecurrenceId to existing posts table
ALTER TABLE "iso_posts"
  ADD COLUMN IF NOT EXISTS "sourceRecurrenceId" TEXT;

CREATE INDEX IF NOT EXISTS "iso_posts_sourceRecurrenceId_idx"
  ON "iso_posts"("sourceRecurrenceId");

-- PostRecurrence: one row per repeating-post configuration
CREATE TABLE IF NOT EXISTS "iso_post_recurrences" (
  "id"                   TEXT        NOT NULL,
  "postId"               TEXT        NOT NULL,
  "recurrenceType"       TEXT        NOT NULL,
  "daysOfWeek"           INTEGER[]   NOT NULL DEFAULT '{}',
  "dayOfMonth"           INTEGER,
  "timeOfDay"            TEXT        NOT NULL,
  "startsAt"             TIMESTAMP   NOT NULL,
  "endsAt"               TIMESTAMP,
  "isActive"             BOOLEAN     NOT NULL DEFAULT TRUE,
  "maxOccurrences"       INTEGER,
  "occurrencesGenerated" INTEGER     NOT NULL DEFAULT 0,
  "lastGeneratedAt"      TIMESTAMP,
  "createdAt"            TIMESTAMP   NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMP   NOT NULL DEFAULT NOW(),

  CONSTRAINT "iso_post_recurrences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "iso_post_recurrences_postId_unique" UNIQUE ("postId"),
  CONSTRAINT "iso_post_recurrences_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "iso_posts"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "iso_post_recurrences_isActive_endsAt_idx"
  ON "iso_post_recurrences"("isActive", "endsAt");

-- PostRecurrenceInstance: one row per scheduled occurrence
CREATE TABLE IF NOT EXISTS "iso_post_recurrence_instances" (
  "id"              TEXT        NOT NULL,
  "recurrenceId"    TEXT        NOT NULL,
  "generatedPostId" TEXT,
  "scheduledFor"    TIMESTAMP   NOT NULL,
  "status"          TEXT        NOT NULL DEFAULT 'PENDING',
  "publishedAt"     TIMESTAMP,
  "errorMessage"    TEXT,
  "createdAt"       TIMESTAMP   NOT NULL DEFAULT NOW(),

  CONSTRAINT "iso_post_recurrence_instances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "iso_post_recurrence_instances_recurrenceId_fkey"
    FOREIGN KEY ("recurrenceId") REFERENCES "iso_post_recurrences"("id") ON DELETE CASCADE,
  CONSTRAINT "iso_post_recurrence_instances_generatedPostId_fkey"
    FOREIGN KEY ("generatedPostId") REFERENCES "iso_posts"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "iso_post_recurrence_instances_recurrenceId_scheduledFor_idx"
  ON "iso_post_recurrence_instances"("recurrenceId", "scheduledFor");

CREATE INDEX IF NOT EXISTS "iso_post_recurrence_instances_status_scheduledFor_idx"
  ON "iso_post_recurrence_instances"("status", "scheduledFor");
