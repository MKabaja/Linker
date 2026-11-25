CREATE TABLE "indexed_order_items" (
	"order_id" bigint NOT NULL,
	"position" integer NOT NULL,
	"order_product_id" bigint,
	"product_id" varchar(50) DEFAULT '' NOT NULL,
	"name" varchar(500) DEFAULT '' NOT NULL,
	"ean" varchar(50) DEFAULT '' NOT NULL,
	"sku" varchar(100) DEFAULT '' NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "indexed_order_items_order_id_position_pk" PRIMARY KEY("order_id","position")
);
--> statement-breakpoint
CREATE TABLE "indexed_orders" (
	"order_id" bigint PRIMARY KEY NOT NULL,
	"external_order_id" varchar(100) DEFAULT '' NOT NULL,
	"order_source" varchar(50) DEFAULT '' NOT NULL,
	"order_source_id" integer DEFAULT 0 NOT NULL,
	"order_status_id" integer DEFAULT 0 NOT NULL,
	"date_add" timestamp with time zone NOT NULL,
	"date_confirmed" timestamp with time zone,
	"first_name_normalized" varchar(100) DEFAULT '' NOT NULL,
	"last_name_normalized" varchar(100) DEFAULT '' NOT NULL,
	"phone_digits" varchar(9) DEFAULT '' NOT NULL,
	"postcode" varchar(10) DEFAULT '' NOT NULL,
	"city_normalized" varchar(100) DEFAULT '' NOT NULL,
	"packages_synced_at" timestamp with time zone,
	"synced_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indexed_packages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "indexed_packages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" bigint NOT NULL,
	"package_number" varchar(100) DEFAULT '' NOT NULL,
	"inner_number" varchar(100) DEFAULT '' NOT NULL,
	"courier_code" varchar(50) DEFAULT '' NOT NULL,
	CONSTRAINT "indexed_packages_order_package_unique" UNIQUE("order_id","package_number")
);
--> statement-breakpoint
CREATE TABLE "sync_state" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "indexed_order_items" ADD CONSTRAINT "indexed_order_items_order_id_indexed_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."indexed_orders"("order_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indexed_packages" ADD CONSTRAINT "indexed_packages_order_id_indexed_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."indexed_orders"("order_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "indexed_orders_date_confirmed_idx" ON "indexed_orders" USING btree ("date_confirmed");--> statement-breakpoint
CREATE INDEX "indexed_orders_external_order_id_idx" ON "indexed_orders" USING btree ("external_order_id");--> statement-breakpoint
CREATE INDEX "indexed_orders_order_source_idx" ON "indexed_orders" USING btree ("order_source");--> statement-breakpoint
CREATE INDEX "indexed_packages_package_number_idx" ON "indexed_packages" USING btree ("package_number");--> statement-breakpoint
CREATE INDEX "indexed_packages_inner_number_idx" ON "indexed_packages" USING btree ("inner_number");