CREATE TABLE "listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"part_id" text NOT NULL,
	"product_name" text NOT NULL,
	"brand_model" text NOT NULL,
	"platform" text NOT NULL,
	"listing_url" text NOT NULL,
	"listing_price_try" integer NOT NULL,
	"listing_date" text NOT NULL,
	"condition_grade" text NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"last_checked_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"part_id" text NOT NULL,
	"listing_id" integer,
	"price_try" integer NOT NULL,
	"is_new" boolean DEFAULT true NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"brand" text NOT NULL,
	"name" text NOT NULL,
	"spec_summary" text DEFAULT '' NOT NULL,
	"image_url" text,
	"socket" text,
	"ram_type" text,
	"form_factor" text,
	"tdp" integer,
	"wattage" integer,
	"max_gpu_length_mm" integer,
	"is_catalog_core" boolean DEFAULT false NOT NULL,
	"source_store" text,
	"external_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_logs" ADD CONSTRAINT "price_logs_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;