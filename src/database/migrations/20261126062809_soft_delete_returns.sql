ALTER TYPE "public"."return_event_kind" ADD VALUE 'deleted';--> statement-breakpoint
ALTER TYPE "public"."return_event_kind" ADD VALUE 'restored';--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "deleted_by" integer;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;