ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "created_user" uuid;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "created_user" uuid;

DO $$ BEGIN
  ALTER TABLE "clients" ADD CONSTRAINT "clients_created_user_users_id_fk"
    FOREIGN KEY ("created_user") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "partners" ADD CONSTRAINT "partners_created_user_users_id_fk"
    FOREIGN KEY ("created_user") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
