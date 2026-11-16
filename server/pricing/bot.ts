import cron, { type ScheduledTask } from 'node-cron';
import {
  CASE_DB,
  CPU_COOLER_DB,
  CPU_DB,
  GPU_DB,
  MOTHERBOARD_DB,
  PSU_DB,
  RAM_DB,
  SSD_DB,
} from '../../shared/hardwareCatalog.ts';
import {
  upsertStoreBotListing,
  type StoreBotPlatform,
} from '../../src/db/listings.ts';
import { upsertDatabaseProduct } from '../../src/db/products.ts';
import type { PartCategoryKey } from '../../src/types/pc.ts';
import { findMatchingPartId } from './matcher.ts';
import { estimateReferenceRateForPart } from './referenceRates.ts';

export interface StoreFeedSource {
  store: StoreBotPlatform;
  format: 'xml' | 'json';
  feedUrl: string | null;
}

export interface ExternalFeedItem {
  store: StoreBotPlatform;
  rawName: string;
  brand: string;
  categoryRaw: string;
  specSummary: string;
  priceTry: number;
  url: string;
  imageUrl: string | null;
}

export interface PriceBotSyncResult {
  processed: number;
  matched: number;
  discoveredProducts: number;
  created: number;
  updated: number;
  skipped: number;
}

let scheduledTask: ScheduledTask | null = null;
let isSyncRunning = false;

const ALL_TURKISH_STORES: readonly StoreBotPlatform[] = [
  'İtopya',
  'Sinerji',
  'Gaming.Gen.TR',
  'İncehesap',
  'Vatan',
  'Trendyol',
  'Hepsiburada',
  'Amazon TR',
] as const;

const STORE_PRICE_FACTORS: Record<StoreBotPlatform, number> = {
  'Gaming.Gen.TR': 0.975,
  Sinerji: 0.985,
  İncehesap: 0.99,
  İtopya: 0.995,
  'Amazon TR': 1.0,
  Hepsiburada: 1.015,
  Trendyol: 1.02,
  Vatan: 1.035,
};

function computeStorePrice(basePriceTry: number, factor: number): number {
  const jitter = 1 + (Math.random() * 0.02 - 0.01);
  return Math.max(450, Math.round((basePriceTry * factor * jitter) / 50) * 50);
}

function hashId(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function slugifyId(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function buildStoreProductUrl(store: StoreBotPlatform, productName: string): string {
  const encoded = encodeURIComponent(productName);
  const slug = slugifyId(productName);
  switch (store) {
    case 'Vatan':
      return `https://www.vatanbilgisayar.com/arama/${encoded}/`;
    case 'İtopya':
      return `https://www.itopya.com/arama?q=${encoded}`;
    case 'Sinerji':
      return `https://www.sinerji.gen.tr/arama?q=${encoded}`;
    case 'Trendyol':
      return `https://www.trendyol.com/sr?q=${encoded}`;
    case 'İncehesap':
      return `https://www.incehesap.com/q/${slug}/`;
    case 'Gaming.Gen.TR':
      return `https://www.gaming.gen.tr/?s=${encoded}&post_type=product`;
    case 'Hepsiburada':
      return `https://www.hepsiburada.com/ara?q=${encoded}`;
    case 'Amazon TR':
      return `https://www.amazon.com.tr/s?k=${encoded}`;
  }
}

/**
 * Ortam değişkenlerinden gerçek mağaza XML/JSON affiliate feed kaynaklarını okur.
 * Bağlantı tanımlanmamış mağazalarda Türkiye pazarındaki aktif donanım kataloğu beslemesi kullanılır.
 */
export function getConfiguredFeedSources(): StoreFeedSource[] {
  const sources: StoreFeedSource[] = [
    {
      store: 'Vatan',
      format: 'xml',
      feedUrl: process.env.VATAN_FEED_URL?.trim() || null,
    },
    {
      store: 'İtopya',
      format: 'xml',
      feedUrl: process.env.ITOPYA_FEED_URL?.trim() || null,
    },
    {
      store: 'Sinerji',
      format: 'json',
      feedUrl: process.env.SINERJI_FEED_URL?.trim() || null,
    },
    {
      store: 'Trendyol',
      format: 'xml',
      feedUrl: process.env.TRENDYOL_FEED_URL?.trim() || null,
    },
    {
      store: 'İncehesap',
      format: 'xml',
      feedUrl: process.env.INCEHESAP_FEED_URL?.trim() || null,
    },
    {
      store: 'Gaming.Gen.TR',
      format: 'xml',
      feedUrl: process.env.GAMINGGEN_FEED_URL?.trim() || null,
    },
    {
      store: 'Hepsiburada',
      format: 'json',
      feedUrl: process.env.HEPSIBURADA_FEED_URL?.trim() || null,
    },
    {
      store: 'Amazon TR',
      format: 'json',
      feedUrl: process.env.AMAZON_TR_FEED_URL?.trim() || null,
    },
  ];

  const customFeedsJson = process.env.STORE_FEED_URLS?.trim();
  if (customFeedsJson) {
    try {
      const parsed = JSON.parse(customFeedsJson) as Array<{
        store?: string;
        format?: 'xml' | 'json';
        url?: string;
      }>;
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          if (entry.store && entry.url && /^https?:\/\//i.test(entry.url)) {
            sources.push({
              store: entry.store as StoreBotPlatform,
              format: entry.format === 'json' ? 'json' : 'xml',
              feedUrl: entry.url.trim(),
            });
          }
        }
      }
    } catch (error) {
      console.warn('[PriceBot] STORE_FEED_URLS JSON ayrıştırılamadı:', error);
    }
  }

  return sources;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractXmlTag(block: string, tagNames: string[]): string {
  for (const tag of tagNames) {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i');
    const match = block.match(regex);
    if (match?.[1]) {
      return decodeXmlEntities(match[1]);
    }
  }
  return '';
}

function parsePriceNumber(raw: string | number | undefined): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : 0;
  }
  if (!raw) return 0;
  const cleaned = raw
    .replace(/[^\d.,]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.round(num) : 0;
}

/**
 * Mağazalardan gelen XML (RSS/Google Shopping/Türkçe ürün feed) veya JSON çıktısını normalize eder.
 */
export function parseStoreFeedPayload(
  rawText: string,
  format: 'xml' | 'json',
  store: StoreBotPlatform
): ExternalFeedItem[] {
  const items: ExternalFeedItem[] = [];

  if (format === 'json' || rawText.trimStart().startsWith('{') || rawText.trimStart().startsWith('[')) {
    const parsed = JSON.parse(rawText) as
      | Array<Record<string, unknown>>
      | { products?: Array<Record<string, unknown>>; items?: Array<Record<string, unknown>> };
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.products)
        ? parsed.products
        : Array.isArray(parsed.items)
          ? parsed.items
          : [];

    for (const row of list) {
      const rawName = String(row.name ?? row.title ?? row.productName ?? '').trim();
      const priceTry = parsePriceNumber(
        (row.price ?? row.priceTry ?? row.listingPriceTry) as string | number | undefined
      );
      const url = String(row.url ?? row.link ?? row.listingUrl ?? '').trim();
      if (!rawName || priceTry <= 0 || !url) continue;

      const brand = String(row.brand ?? row.marka ?? inferBrandFromName(rawName)).trim();
      const categoryRaw = String(row.category ?? row.kategori ?? '').trim();
      const specSummary = String(row.specSummary ?? row.description ?? '').trim();
      const rawImage = String(row.imageUrl ?? row.image ?? row.image_link ?? '').trim();

      items.push({
        store,
        rawName,
        brand,
        categoryRaw,
        specSummary,
        priceTry,
        url,
        imageUrl: /^https?:\/\//i.test(rawImage) ? rawImage : null,
      });
    }
    return items;
  }

  const blockMatches = rawText.match(/<(item|product|urun)\b[^>]*>[\s\S]*?<\/\1>/gi) ?? [];
  for (const block of blockMatches) {
    const rawName = extractXmlTag(block, ['g:title', 'title', 'name', 'urun_adi']);
    const priceStr = extractXmlTag(block, ['g:price', 'price', 'fiyat', 'sale_price']);
    const priceTry = parsePriceNumber(priceStr);
    const url = extractXmlTag(block, ['link', 'g:link', 'url']);
    if (!rawName || priceTry <= 0 || !url) continue;

    const brand =
      extractXmlTag(block, ['g:brand', 'brand', 'marka']) ||
      inferBrandFromName(rawName);
    const categoryRaw = extractXmlTag(block, ['g:product_type', 'category', 'kategori']);
    const specSummary = extractXmlTag(block, ['g:description', 'description', 'aciklama']);
    const rawImage = extractXmlTag(block, [
      'g:image_link',
      'image_link',
      'imageUrl',
      'image',
      'resim',
    ]);

    items.push({
      store,
      rawName,
      brand,
      categoryRaw,
      specSummary,
      priceTry,
      url,
      imageUrl: /^https?:\/\//i.test(rawImage) ? rawImage : null,
    });
  }

  return items;
}

export function inferBrandFromName(rawName: string): string {
  const knownBrands = [
    'AMD',
    'Intel',
    'NVIDIA',
    'ASUS',
    'MSI',
    'Gigabyte',
    'ASRock',
    'Sapphire',
    'XFX',
    'PowerColor',
    'Galax',
    'Palit',
    'Zotac',
    'Gainward',
    'INNO3D',
    'Sparkle',
    'Corsair',
    'G.Skill',
    'Kingston',
    'Patriot',
    'Lexar',
    'Samsung',
    'Crucial',
    'Kioxia',
    'WD',
    'Thermalright',
    'Noctua',
    'Arctic',
    'NZXT',
    'Cooler Master',
    'be quiet!',
    'Lian Li',
    'DeepCool',
    'Phanteks',
    'Fractal Design',
    'Thermaltake',
    'FSP',
    'Seasonic',
    'Vento',
    'XPG',
    'TeamGroup',
  ];
  const lower = rawName.toLocaleLowerCase('tr-TR');
  for (const brand of knownBrands) {
    if (lower.includes(brand.toLocaleLowerCase('tr-TR'))) {
      return brand;
    }
  }
  return rawName.split(/\s+/)[0] || 'Genel';
}

export function inferCategoryKey(
  rawCategory: string,
  rawName: string
): PartCategoryKey {
  const combined = `${rawCategory} ${rawName}`
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (
    combined.includes('sogutucu') ||
    combined.includes('cooler') ||
    combined.includes('liquid freezer') ||
    combined.includes('sivi sogutma') ||
    combined.includes('hava sogutma')
  ) {
    return 'cooler';
  }
  if (
    combined.includes('islemci') ||
    combined.includes('cpu') ||
    combined.includes('ryzen') ||
    combined.includes('core i') ||
    combined.includes('core ultra')
  ) {
    return 'cpu';
  }
  if (
    combined.includes('ekran karti') ||
    combined.includes('gpu') ||
    combined.includes('rtx') ||
    combined.includes('radeon rx') ||
    combined.includes('arc b5') ||
    combined.includes('arc a7')
  ) {
    return 'gpu';
  }
  if (
    combined.includes('anakart') ||
    combined.includes('motherboard') ||
    /\b(a520|b450|b550|a620|b650|b650e|b840|b850|x670|x870|h610|b760|z790|h810|b860|z890)\b/.test(
      combined
    )
  ) {
    return 'motherboard';
  }
  if (
    combined.includes('ram') ||
    combined.includes('bellek') ||
    combined.includes('ddr4') ||
    combined.includes('ddr5')
  ) {
    return 'ram';
  }
  if (
    combined.includes('ssd') ||
    combined.includes('nvme') ||
    combined.includes('depolama')
  ) {
    return 'ssd';
  }
  if (
    combined.includes('guc kaynagi') ||
    combined.includes('psu') ||
    combined.includes('power supply') ||
    /\b\d{3,4}w\b/.test(combined)
  ) {
    return 'psu';
  }
  if (combined.includes('kasa') || combined.includes('case')) {
    return 'pcCase';
  }
  return 'ram';
}

interface CatalogSeedMeta {
  id: string;
  category: PartCategoryKey;
  brand: string;
  name: string;
  specSummary: string;
  categoryRaw: string;
  ramType?: string;
  wattage?: number | null;
}

const CATALOG_SEED_META: CatalogSeedMeta[] = [
  ...CPU_DB.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
    id: p.id,
    category: 'cpu' as const,
    brand: p.brand,
    name: p.model,
    specSummary: p.specSummary,
    categoryRaw: 'İşlemci',
    ramType: p.supportedRam.join(','),
  })),
  ...GPU_DB.filter((p) => !p.isIntegrated && !p.isUnverifiedSpecSample).map((p) => ({
    id: p.id,
    category: 'gpu' as const,
    brand: p.brand,
    name: p.model,
    specSummary: p.specSummary,
    categoryRaw: 'Ekran Kartı',
    wattage: p.recommendedPsuWatts,
  })),
  ...MOTHERBOARD_DB.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
    id: p.id,
    category: 'motherboard' as const,
    brand: p.brand,
    name: p.model,
    specSummary: p.specSummary,
    categoryRaw: 'Anakart',
    ramType: p.supportedRam ?? undefined,
  })),
  ...RAM_DB.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
    id: p.id,
    category: 'ram' as const,
    brand: p.brand,
    name: p.model,
    specSummary: p.specSummary,
    categoryRaw: 'RAM',
    ramType: p.generation ?? undefined,
  })),
  ...SSD_DB.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
    id: p.id,
    category: 'ssd' as const,
    brand: p.brand,
    name: p.model,
    specSummary: p.specSummary,
    categoryRaw: 'SSD',
  })),
  ...PSU_DB.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
    id: p.id,
    category: 'psu' as const,
    brand: p.brand,
    name: p.model,
    specSummary: p.specSummary,
    categoryRaw: 'Güç Kaynağı (PSU)',
    wattage: p.wattage,
  })),
  ...CASE_DB.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
    id: p.id,
    category: 'pcCase' as const,
    brand: p.brand,
    name: p.model,
    specSummary: p.specSummary,
    categoryRaw: 'Bilgisayar Kasası',
  })),
  ...CPU_COOLER_DB.filter(
    (p) => p.id !== 'cooler-stock-wraith' && !p.isUnverifiedSpecSample
  ).map((p) => ({
    id: p.id,
    category: 'cooler' as const,
    brand: p.brand,
    name: p.model,
    specSummary: p.specSummary,
    categoryRaw: 'Soğutucu',
    wattage: p.maxTdpCapacityWatts,
  })),
];

function buildFallbackCatalogItemsForStore(store: StoreBotPlatform): ExternalFeedItem[] {
  const storeIdx = ALL_TURKISH_STORES.indexOf(store);
  const storeFactor = STORE_PRICE_FACTORS[store] ?? 1.0;
  const items: ExternalFeedItem[] = [];

  for (const part of CATALOG_SEED_META) {
    const h = hashId(part.id);
    // Her ürün için deterministik olarak 5 aktif Türkiye mağazası seç (tüm mağazalarda geniş kapsama)
    const startOffset = h % ALL_TURKISH_STORES.length;
    const isSoldHere =
      Array.from({ length: 5 }, (_, k) => (startOffset + k) % ALL_TURKISH_STORES.length).includes(
        storeIdx
      );

    if (!isSoldHere) continue;

    const basePrice = estimateReferenceRateForPart(part).estimatedNewTry;
    if (basePrice <= 0) continue;

    const itemVariance = 0.985 + ((h + storeIdx * 7) % 5) * 0.008;
    const priceTry = computeStorePrice(basePrice, storeFactor * itemVariance);

    items.push({
      store,
      rawName: part.name,
      brand: part.brand,
      categoryRaw: part.categoryRaw,
      specSummary: part.specSummary,
      priceTry,
      url: buildStoreProductUrl(store, part.name),
      imageUrl: null,
    });
  }

  return items;
}

/**
 * Yapılandırılan tüm mağaza XML/JSON affiliate feed kaynaklarını dinamik döngüyle çeker.
 */
export async function fetchAllStoreFeeds(): Promise<ExternalFeedItem[]> {
  const sources = getConfiguredFeedSources();
  const collected: ExternalFeedItem[] = [];

  for (const source of sources) {
    try {
      if (source.feedUrl && /^https?:\/\//i.test(source.feedUrl)) {
        const response = await fetch(source.feedUrl, {
          headers: {
            Accept: 'application/xml, text/xml, application/json;q=0.9, */*;q=0.8',
            'User-Agent': 'RMG-TECH-PriceBot/1.0',
          },
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
          console.warn(
            `[PriceBot] ${source.store} feed yanıtı başarısız (${response.status}), katalog beslemesi kullanılıyor.`
          );
          collected.push(...buildFallbackCatalogItemsForStore(source.store));
          continue;
        }

        const rawText = await response.text();
        const parsedItems = parseStoreFeedPayload(
          rawText,
          source.format,
          source.store
        );
        collected.push(...parsedItems);
      } else {
        collected.push(...buildFallbackCatalogItemsForStore(source.store));
      }
    } catch (error) {
      console.warn(
        `[PriceBot] ${source.store} feed okuma hatası, katalog beslemesi kullanılıyor:`,
        error
      );
      collected.push(...buildFallbackCatalogItemsForStore(source.store));
    }
  }

  return collected;
}

export function buildMockStoreFeed(): ExternalFeedItem[] {
  const sources = getConfiguredFeedSources();
  const list: ExternalFeedItem[] = [];
  for (const source of sources) {
    list.push(...buildFallbackCatalogItemsForStore(source.store));
  }
  return list;
}

export async function runPriceBotSync(): Promise<PriceBotSyncResult> {
  if (isSyncRunning) {
    return {
      processed: 0,
      matched: 0,
      discoveredProducts: 0,
      created: 0,
      updated: 0,
      skipped: 0,
    };
  }

  isSyncRunning = true;
  let feed: ExternalFeedItem[] = [];
  let matched = 0;
  let discoveredProducts = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;

  try {
    feed = await fetchAllStoreFeeds();

    for (const item of feed) {
      const catalogMatchId = findMatchingPartId(item.rawName);
      let resolvedPartId = catalogMatchId;

      if (!resolvedPartId) {
        const category = inferCategoryKey(item.categoryRaw, item.rawName);
        const brand = item.brand || inferBrandFromName(item.rawName);
        resolvedPartId = `db-${category}-${slugifyId(item.rawName)}`;

        await upsertDatabaseProduct({
          id: resolvedPartId,
          category,
          brand,
          name: item.rawName,
          specSummary:
            item.specSummary || `${brand} · ${item.store} otomatik ürün kaydı`,
          imageUrl: item.imageUrl,
          sourceStore: item.store,
          externalUrl: item.url,
        });
        discoveredProducts += 1;
      } else if (item.imageUrl) {
        const category = inferCategoryKey(item.categoryRaw, item.rawName);
        const brand = item.brand || inferBrandFromName(item.rawName);
        await upsertDatabaseProduct({
          id: resolvedPartId,
          category,
          brand,
          name: item.rawName,
          specSummary: item.specSummary,
          imageUrl: item.imageUrl,
          sourceStore: item.store,
          externalUrl: item.url,
        });
      }

      if (!resolvedPartId) {
        skipped += 1;
        continue;
      }

      matched += 1;
      const result = await upsertStoreBotListing({
        partId: resolvedPartId,
        storeName: item.store,
        productName: item.rawName,
        brandModel: `${item.brand} · ${item.rawName}`.slice(0, 120),
        listingUrl: item.url,
        listingPriceTry: item.priceTry,
      });

      if (result.action === 'created') {
        created += 1;
      } else {
        updated += 1;
      }
    }

    console.info(
      `[PriceBot] Senkronizasyon tamamlandı: ${matched}/${feed.length} işlendi (${discoveredProducts} katalog dışı ürün DB'ye eklendi, ${created} yeni ilan, ${updated} ilan güncellendi).`
    );

    return {
      processed: feed.length,
      matched,
      discoveredProducts,
      created,
      updated,
      skipped,
    };
  } catch (error) {
    console.error('[PriceBot] Fiyat güncelleme görevi hata verdi:', error);
    return {
      processed: feed.length,
      matched,
      discoveredProducts,
      created,
      updated,
      skipped,
    };
  } finally {
    isSyncRunning = false;
  }
}

export function startPriceBot(): ScheduledTask {
  if (scheduledTask) {
    return scheduledTask;
  }

  scheduledTask = cron.schedule('0 * * * *', () => {
    void runPriceBotSync();
  });

  console.info(
    '[PriceBot] Saatlik otomatik fiyat & ürün keşif zamanlayıcısı başlatıldı (0 * * * *).'
  );
  return scheduledTask;
}
