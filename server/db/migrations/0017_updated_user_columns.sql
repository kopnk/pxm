ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "updated_user" uuid;
ALTER TABLE "project_details" ADD COLUMN IF NOT EXISTS "updated_user" uuid;
ALTER TABLE "project_progress" ADD COLUMN IF NOT EXISTS "updated_user" uuid;
ALTER TABLE "project_financials" ADD COLUMN IF NOT EXISTS "updated_user" uuid;
ALTER TABLE "dcn" ADD COLUMN IF NOT EXISTS "updated_user" uuid;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "updated_user" uuid;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "updated_user" uuid;

DO $$ BEGIN
  ALTER TABLE "projects" ADD CONSTRAINT "projects_updated_user_users_id_fk"
    FOREIGN KEY ("updated_user") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "project_details" ADD CONSTRAINT "project_details_updated_user_users_id_fk"
    FOREIGN KEY ("updated_user") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "project_progress" ADD CONSTRAINT "project_progress_updated_user_users_id_fk"
    FOREIGN KEY ("updated_user") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "project_financials" ADD CONSTRAINT "project_financials_updated_user_users_id_fk"
    FOREIGN KEY ("updated_user") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "dcn" ADD CONSTRAINT "dcn_updated_user_users_id_fk"
    FOREIGN KEY ("updated_user") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "clients" ADD CONSTRAINT "clients_updated_user_users_id_fk"
    FOREIGN KEY ("updated_user") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "partners" ADD CONSTRAINT "partners_updated_user_users_id_fk"
    FOREIGN KEY ("updated_user") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
