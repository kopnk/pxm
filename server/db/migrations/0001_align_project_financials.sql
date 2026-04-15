ALTER TABLE "project_financials" ADD COLUMN "balap_number" text;--> statement-breakpoint
ALTER TABLE "project_financials" ADD COLUMN "balap_date" date;--> statement-breakpoint
ALTER TABLE "project_financials" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_financials" ADD COLUMN "doc_type" text;--> statement-breakpoint
ALTER TABLE "project_financials" ADD COLUMN "doc_number" text;--> statement-breakpoint
ALTER TABLE "project_financials" ADD COLUMN "doc_date" date;--> statement-breakpoint
ALTER TABLE "project_financials" ADD COLUMN "amount" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "project_financials" ADD COLUMN "tax_in" numeric(18, 4);--> statement-breakpoint
ALTER TABLE "project_financials" ADD COLUMN "tax_out" numeric(18, 4);--> statement-breakpoint
ALTER TABLE "project_financials" ADD COLUMN "pph" numeric(18, 4);--> statement-breakpoint
ALTER TABLE "project_financials" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "project_financials" ADD COLUMN "stage" integer;--> statement-breakpoint
ALTER TABLE "project_financials" ADD COLUMN "client_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "project_financials" ADD COLUMN "partner_snapshot" jsonb;