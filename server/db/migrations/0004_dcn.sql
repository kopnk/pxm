CREATE TYPE "public"."dcn_flow" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TABLE "dcn" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"letter_date" date NOT NULL,
	"number" varchar(100) NOT NULL,
	"type" varchar(50),
	"to_address" varchar(255),
	"from_address" varchar(255),
	"subject" text,
	"flow" "dcn_flow" NOT NULL,
	"created_user" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dcn" ADD CONSTRAINT "dcn_created_user_users_id_fk" FOREIGN KEY ("created_user") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
