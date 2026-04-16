-- AddColumn: publishError to Post for tracking publication failures
ALTER TABLE "isysocial"."iso_posts" ADD COLUMN "publishError" JSONB;

-- Index for finding posts with errors
CREATE INDEX "idx_iso_posts_publishError_not_null" ON "isysocial"."iso_posts"("publishError") WHERE "publishError" IS NOT NULL;
