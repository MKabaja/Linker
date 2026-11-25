CREATE TYPE "public"."return_event_kind" AS ENUM('created', 'updated');--> statement-breakpoint
CREATE TYPE "public"."return_item_condition" AS ENUM('accepted', 'damaged');--> statement-breakpoint
CREATE TABLE "return_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "return_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"return_id" integer NOT NULL,
	"kind" "return_event_kind" NOT NULL,
	"snapshot" jsonb NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "return_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "return_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"return_id" integer NOT NULL,
	"position" integer NOT NULL,
	"order_product_id" bigint,
	"name" varchar(500) DEFAULT '' NOT NULL,
	"ean" varchar(50) DEFAULT '' NOT NULL,
	"sku" varchar(100) DEFAULT '' NOT NULL,
	"quantity_ordered" integer NOT NULL,
	"quantity_received" integer NOT NULL,
	"condition" "return_item_condition" DEFAULT 'accepted' NOT NULL,
	CONSTRAINT "return_items_quantities_not_negative" CHECK ("return_items"."quantity_ordered" >= 0 and "return_items"."quantity_received" >= 0)
);
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "returns_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" bigint NOT NULL,
	"order_source" varchar(50) DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"received_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "returns_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
ALTER TABLE "return_events" ADD CONSTRAINT "return_events_return_id_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_events" ADD CONSTRAINT "return_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_return_id_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "return_events_return_id_idx" ON "return_events" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "return_items_return_id_idx" ON "return_items" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "returns_created_at_idx" ON "returns" USING btree ("created_at");