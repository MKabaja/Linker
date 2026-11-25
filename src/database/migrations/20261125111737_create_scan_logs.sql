CREATE TYPE "public"."scan_outcome" AS ENUM('auto', 'manual-pick', 'manual-entry', 'not-found', 'aborted');--> statement-breakpoint
CREATE TABLE "scan_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "scan_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"scan_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"duration_ms" integer NOT NULL,
	"outcome" "scan_outcome" NOT NULL,
	"chosen_order_id" bigint,
	"traces" jsonb NOT NULL,
	"top_candidates" jsonb NOT NULL,
	"ocr" jsonb NOT NULL,
	"carriers" jsonb NOT NULL,
	"camera_label" varchar(200),
	"diagnostics" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scan_logs_scanId_unique" UNIQUE("scan_id")
);
--> statement-breakpoint
ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scan_logs_created_at_idx" ON "scan_logs" USING btree ("created_at");