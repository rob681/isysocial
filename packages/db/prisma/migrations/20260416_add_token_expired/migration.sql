SET search_path TO isysocial;

ALTER TABLE "iso_client_social_networks"
  ADD COLUMN IF NOT EXISTS "token_expired" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "iso_client_social_networks"
  ADD COLUMN IF NOT EXISTS "token_error_msg" TEXT;
