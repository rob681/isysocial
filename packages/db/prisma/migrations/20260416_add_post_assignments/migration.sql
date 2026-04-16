SET search_path TO isysocial;
CREATE TABLE IF NOT EXISTS "iso_post_assignments" (
  "id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'editor',
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "iso_post_assignments_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "iso_post_assignments" ADD CONSTRAINT "iso_post_assignments_post_id_fkey"
  FOREIGN KEY ("post_id") REFERENCES "iso_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "iso_post_assignments_post_id_user_id_key"
  ON "iso_post_assignments"("post_id", "user_id");
