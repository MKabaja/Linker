CREATE TABLE "product_images" (
	"product_id" bigint PRIMARY KEY NOT NULL,
	"ean" varchar(50) DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
