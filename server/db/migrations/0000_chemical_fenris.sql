CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_table" text NOT NULL,
	"target_id" uuid,
	"old_data" jsonb,
	"new_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"npwp" text,
	"bank_name" text,
	"bank_account" text,
	"address_text" text,
	"address_meta" jsonb,
	"contact_name" text,
	"contact_phone" text,
	"contact_email" text,
	"signatory_name" text,
	"signatory_title" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_npwp_unique" UNIQUE("npwp")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"region" text,
	"area" text,
	"role" text DEFAULT 'staff',
	"phone" text,
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"npwp" text,
	"bank_name" text,
	"bank_account" text,
	"partner_type" text,
	"address_text" text,
	"address_meta" jsonb,
	"contact_name" text,
	"contact_phone" text,
	"contact_email" text,
	"signatory_name" text,
	"signatory_title" text,
	"tax_in" numeric(18, 4),
	"tax_out" numeric(18, 4),
	"pph" numeric(18, 4),
	"rating" numeric(2, 1),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "partners_npwp_unique" UNIQUE("npwp")
);
--> statement-breakpoint
CREATE TABLE "progress_stage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"stage_type" text NOT NULL,
	"sequence" integer NOT NULL,
	"is_required" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_user" uuid,
	CONSTRAINT "progress_stage_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_number" text,
	"pr_sc_number" text NOT NULL,
	"po_number" text NOT NULL,
	"po_date" date NOT NULL,
	"delivery_date" date,
	"kom_date" date,
	"project_name" text NOT NULL,
	"sub_total" numeric(18, 2),
	"discount" numeric(18, 2) DEFAULT '0',
	"net_price" numeric(18, 2),
	"vat_rate" numeric(5, 2) DEFAULT '11',
	"vat_amount" numeric(18, 2),
	"grand_total" numeric(18, 2),
	"status" text DEFAULT 'active',
	"pm" text,
	"client_id" uuid,
	"created_user" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_pr_sc_number_unique" UNIQUE("pr_sc_number"),
	CONSTRAINT "projects_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
CREATE TABLE "project_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref_table" text NOT NULL,
	"ref_id" uuid NOT NULL,
	"file_category" text NOT NULL,
	"file_name" text,
	"file_url" text NOT NULL,
	"file_size" bigint,
	"mime_type" text,
	"version" integer DEFAULT 1 NOT NULL,
	"uploaded_by" uuid,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	"restored_at" timestamp,
	"is_archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"city_kab_id" uuid NOT NULL,
	"pic_area" text,
	"line_number" integer,
	"systemkey" text,
	"ne_id" text,
	"material_id" text,
	"material_name" text,
	"site_id" text,
	"site_name" text,
	"quantity" numeric(12, 2),
	"uom" text,
	"unit_price" numeric(18, 2),
	"total_price" numeric(18, 2),
	"status" text DEFAULT 'active',
	"remarks_projects_details" text,
	"remarks_delay" text,
	"remarks_cancel" text,
	"tax_in" numeric(18, 4),
	"tax_out" numeric(18, 4),
	"pph" numeric(18, 4),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_user" uuid
);
--> statement-breakpoint
CREATE TABLE "project_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"project_detail_id" uuid NOT NULL,
	"stage_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_user" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_financials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"project_detail_id" uuid NOT NULL,
	"project_progress_id" uuid,
	"balap_id" uuid,
	"bast_id" uuid,
	"flow_direction" text NOT NULL,
	"client_id" uuid,
	"partner_id" uuid,
	"bast_number" text,
	"bast_date" date,
	"po_number_partner" text,
	"po_date_partner" date,
	"invoice_number_partner" text,
	"invoice_date_partner" date,
	"fp_number_partner" text,
	"fp_date_partner" date,
	"qty_partner" numeric(18, 4),
	"unit_price_partner" numeric(18, 2),
	"po_number_client" text,
	"po_date_client" date,
	"invoice_number_client" text,
	"invoice_date_client" date,
	"fp_number_client" text,
	"fp_date_client" date,
	"qty_client" numeric(18, 4),
	"unit_price_client" numeric(18, 2),
	"created_user" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regions" ADD CONSTRAINT "regions_parent_id_regions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_stage" ADD CONSTRAINT "progress_stage_created_user_users_id_fk" FOREIGN KEY ("created_user") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_user_users_id_fk" FOREIGN KEY ("created_user") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_details" ADD CONSTRAINT "project_details_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_details" ADD CONSTRAINT "project_details_city_kab_id_regions_id_fk" FOREIGN KEY ("city_kab_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_details" ADD CONSTRAINT "project_details_created_user_users_id_fk" FOREIGN KEY ("created_user") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_progress" ADD CONSTRAINT "project_progress_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_progress" ADD CONSTRAINT "project_progress_project_detail_id_project_details_id_fk" FOREIGN KEY ("project_detail_id") REFERENCES "public"."project_details"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_progress" ADD CONSTRAINT "project_progress_created_user_users_id_fk" FOREIGN KEY ("created_user") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_financials" ADD CONSTRAINT "project_financials_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_financials" ADD CONSTRAINT "project_financials_project_detail_id_project_details_id_fk" FOREIGN KEY ("project_detail_id") REFERENCES "public"."project_details"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_financials" ADD CONSTRAINT "project_financials_project_progress_id_project_progress_id_fk" FOREIGN KEY ("project_progress_id") REFERENCES "public"."project_progress"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_financials" ADD CONSTRAINT "project_financials_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_financials" ADD CONSTRAINT "project_financials_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_financials" ADD CONSTRAINT "project_financials_created_user_users_id_fk" FOREIGN KEY ("created_user") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_actor" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_audit_target" ON "audit_log" USING btree ("target_table","target_id");--> statement-breakpoint
CREATE INDEX "idx_audit_created_at" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_regions_parent" ON "regions" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_files_ref" ON "project_files" USING btree ("ref_table","ref_id");--> statement-breakpoint
CREATE INDEX "idx_files_deleted" ON "project_files" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_files_uploaded_by" ON "project_files" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "idx_files_version" ON "project_files" USING btree ("ref_table","ref_id","version");--> statement-breakpoint
CREATE INDEX "idx_progress_project" ON "project_progress" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_progress_detail" ON "project_progress" USING btree ("project_detail_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_project_detail_progress" ON "project_progress" USING btree ("project_id","project_detail_id");--> statement-breakpoint
CREATE INDEX "idx_financial_project" ON "project_financials" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_financial_detail" ON "project_financials" USING btree ("project_detail_id");--> statement-breakpoint
CREATE INDEX "idx_financial_progress" ON "project_financials" USING btree ("project_progress_id");--> statement-breakpoint
CREATE INDEX "idx_financial_balap" ON "project_financials" USING btree ("balap_id");--> statement-breakpoint
CREATE INDEX "idx_financial_bast" ON "project_financials" USING btree ("bast_id");--> statement-breakpoint
CREATE INDEX "idx_financial_flow" ON "project_financials" USING btree ("flow_direction");--> statement-breakpoint
CREATE INDEX "idx_financial_client" ON "project_financials" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_financial_partner" ON "project_financials" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "idx_financial_project_flow" ON "project_financials" USING btree ("project_id","flow_direction");