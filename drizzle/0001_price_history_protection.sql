ALTER TABLE "price_logs" DROP CONSTRAINT "price_logs_listing_id_listings_id_fk";
--> statement-breakpoint
ALTER TABLE "price_logs" ADD COLUMN "platform" text;--> statement-breakpoint
ALTER TABLE "price_logs" ADD CONSTRAINT "price_logs_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;