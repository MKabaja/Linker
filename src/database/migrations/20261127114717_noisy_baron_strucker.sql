CREATE TABLE "indexed_order_returns" (
	"return_id" bigint PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"reference_number" varchar(100) DEFAULT '' NOT NULL,
	"package_number" varchar(100) DEFAULT '' NOT NULL,
	"package_module" varchar(50) DEFAULT '' NOT NULL,
	"source" varchar(50) DEFAULT '' NOT NULL,
	"status_id" integer DEFAULT 0 NOT NULL,
	"full_name" varchar(200) DEFAULT '' NOT NULL,
	"postcode" varchar(10) DEFAULT '' NOT NULL,
	"products" jsonb NOT NULL,
	"date_add" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "indexed_packages" ADD COLUMN "is_return" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "indexed_order_returns_reference_number_idx" ON "indexed_order_returns" USING btree ("reference_number");--> statement-breakpoint
CREATE INDEX "indexed_order_returns_package_number_idx" ON "indexed_order_returns" USING btree ("package_number");--> statement-breakpoint
CREATE INDEX "indexed_order_returns_order_id_idx" ON "indexed_order_returns" USING btree ("order_id");