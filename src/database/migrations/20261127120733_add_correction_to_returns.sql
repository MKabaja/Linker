ALTER TABLE "returns" ADD COLUMN "correction_issued_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "correction_issued_by" integer;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_correction_issued_by_users_id_fk" FOREIGN KEY ("correction_issued_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;