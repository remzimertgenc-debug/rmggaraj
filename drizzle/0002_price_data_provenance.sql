-- Aşama 1: Fiyat verisi kaynak güvenilirliği ve köken ayrımı (is_simulated & data_origin)
-- NOT: Bu dosya yalnızca migration tanımı olarak oluşturulmuştur; Supabase üzerinde otomatik çalıştırılmaz.
-- KURALLAR:
--   1. Kaynağı kanıtlanamayan eski kayıtlar 'legacy_unknown' olarak kalır (asla varsayılan 'store_feed' yapılmaz).
--   2. listing_id değeri NULL olan bütün price_logs kayıtları otomatik olarak 'synthetic_backfill' kabul edilmez;
--      yalnızca sentetik olduğu kanıtlanan ilana bağlı kayıtlar işaretlenir, diğerleri 'legacy_unknown' korunur.
--   3. Kullanıcı ilanları silinmez ve kullanıcı verileri değiştirilmez.

ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "is_simulated" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "data_origin" text DEFAULT 'legacy_unknown' NOT NULL;
--> statement-breakpoint
ALTER TABLE "price_logs" ADD COLUMN IF NOT EXISTS "is_simulated" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "price_logs" ADD COLUMN IF NOT EXISTS "data_origin" text DEFAULT 'legacy_unknown' NOT NULL;
--> statement-breakpoint

-- Kullanıcı tarafından oluşturulmuş mevcut ilanların köken sınıflandırması (içerik değiştirilmez)
UPDATE "listings"
SET
  "is_simulated" = false,
  "data_origin" = 'user_submitted'
WHERE "user_id" IS NOT NULL
  AND "data_origin" = 'legacy_unknown';
--> statement-breakpoint

-- Yalnızca botun sentetik arama URL kalıplarıyla üretildiği kanıtlanabilen (user_id IS NULL) ilanları işaretle
UPDATE "listings"
SET
  "is_simulated" = true,
  "data_origin" = 'synthetic_fallback'
WHERE "user_id" IS NULL
  AND "data_origin" = 'legacy_unknown'
  AND (
    "listing_url" LIKE 'https://www.vatanbilgisayar.com/arama/%'
    OR "listing_url" LIKE 'https://www.itopya.com/arama?q=%'
    OR "listing_url" LIKE 'https://www.sinerji.gen.tr/arama?q=%'
    OR "listing_url" LIKE 'https://www.trendyol.com/sr?q=%'
    OR "listing_url" LIKE 'https://www.incehesap.com/q/%'
    OR "listing_url" LIKE 'https://www.gaming.gen.tr/?s=%&post_type=product'
    OR "listing_url" LIKE 'https://www.hepsiburada.com/ara?q=%'
    OR "listing_url" LIKE 'https://www.amazon.com.tr/s?k=%'
  );
--> statement-breakpoint

-- Sentetik ilanlara bağlı price_logs kayıtlarını işaretle (listing_id IS NULL olanlara dokunulmaz)
UPDATE "price_logs" AS pl
SET
  "is_simulated" = true,
  "data_origin" = CASE
    WHEN pl."recorded_at" < (l."created_at" - INTERVAL '1 hour') THEN 'synthetic_backfill'
    ELSE 'synthetic_fallback'
  END
FROM "listings" AS l
WHERE pl."listing_id" = l."id"
  AND l."is_simulated" = true
  AND pl."data_origin" = 'legacy_unknown';
--> statement-breakpoint

-- Kullanıcı ilanlarına bağlı price_logs kayıtlarını işaretle
UPDATE "price_logs" AS pl
SET
  "is_simulated" = false,
  "data_origin" = 'user_submitted'
FROM "listings" AS l
WHERE pl."listing_id" = l."id"
  AND l."data_origin" = 'user_submitted'
  AND pl."data_origin" = 'legacy_unknown';
--> statement-breakpoint

-- Sorgu performansı için birleşik indeksler
CREATE INDEX IF NOT EXISTS "idx_listings_new_sim_part" ON "listings" ("is_new", "is_simulated", "part_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_logs_part_new_sim_recorded" ON "price_logs" ("part_id", "is_new", "is_simulated", "recorded_at");
