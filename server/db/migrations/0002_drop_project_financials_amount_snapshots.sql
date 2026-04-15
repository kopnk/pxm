ALTER TABLE "project_financials" DROP COLUMN IF EXISTS "amount";--> statement-breakpoint
ALTER TABLE "project_financials" DROP COLUMN IF EXISTS "client_snapshot";--> statement-breakpoint
ALTER TABLE "project_financials" DROP COLUMN IF EXISTS "partner_snapshot";
