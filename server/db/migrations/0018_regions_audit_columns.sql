ALTER TABLE "regions" ADD COLUMN IF NOT EXISTS "created_user" uuid;
ALTER TABLE "regions" ADD COLUMN IF NOT EXISTS "updated_user" uuid;
ALTER TABLE "regions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone;

DO $$ BEGIN
  ALTER TABLE "regions" ADD CONSTRAINT "regions_created_user_users_id_fk"
    FOREIGN KEY ("created_user") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "regions" ADD CONSTRAINT "regions_updated_user_users_id_fk"
    FOREIGN KEY ("updated_user") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "regions"
  ALTER COLUMN "created_at" TYPE timestamp with time zone
  USING "created_at" AT TIME ZONE 'Asia/Jakarta';

UPDATE "regions"
SET "updated_at" = "created_at"
WHERE "updated_at" IS NULL;

ALTER TABLE "regions"
  ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "regions"
  ALTER COLUMN "updated_at" SET NOT NULL;
