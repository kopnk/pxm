ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_user" uuid;
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_created_user_users_id_fk"
    FOREIGN KEY ("created_user") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
