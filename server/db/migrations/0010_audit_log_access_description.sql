ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "access_via" text;
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "description" text;
