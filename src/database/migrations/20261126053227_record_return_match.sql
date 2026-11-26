CREATE TYPE "public"."return_matched_by" AS ENUM('auto', 'manual-pick', 'manual-entry', 'imported');--> statement-breakpoint
ALTER TABLE "return_events" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "returns" ALTER COLUMN "received_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "matched_by" "return_matched_by" DEFAULT 'manual-entry' NOT NULL;--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "scanned_label" varchar(64);--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_received_by_required" CHECK ("returns"."received_by" is not null or "returns"."matched_by" = 'imported');