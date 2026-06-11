ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_user" uuid;

DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_updated_user_users_id_fk"
    FOREIGN KEY ("updated_user") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE "users"
SET "updated_user" = "created_user"
WHERE "updated_user" IS NULL AND "created_user" IS NOT NULL;
