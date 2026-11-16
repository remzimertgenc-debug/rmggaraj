import cron, { type ScheduledTask } from 'node-cron';
import {
  upsertStoreBotListing,
  type StoreBotPlatform,
} from '../../src/db/listings.ts';
import { upsertDatabaseProduct } from '../../src/db/products.ts';
import type { PartCategoryKey } from '../../src/types/pc.ts';
import { findMatchingPartId } from './matcher.ts';
import { REFERENCE_RATES } from './referenceRates.ts';

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

function computeStorePrice(basePriceTry: number, factor: number): number {
  const jitter = 1 + (Math.random() * 0.03 - 0.015);
  return Math.round((basePriceTry * factor * jitter) / 50) * 50;
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

/**
 * Ortam değişkenlerinden gerçek mağaza XML/JSON affiliate feed kaynaklarını okur.
 * Bağlantı tanımlanmamış mağazalarda dahili simülasyon beslemesi kullanılır.
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
    'Corsair',
    'G.Skill',
    'Kingston',
    'Samsung',
    'Crucial',
    'WD',
    'Thermalright',
    'NZXT',
    'Cooler Master',
    'be quiet!',
    'Lian Li',
    'DeepCool',
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
    combined.includes('liquid freezer')
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
    combined.includes('radeon rx')
  ) {
    return 'gpu';
  }
  if (
    combined.includes('anakart') ||
    combined.includes('motherboard') ||
    /\b(b650|b760|x670|x870|z790|z890|a620|b550)\b/.test(combined)
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
  if (combined.includes('sogutucu') || combined.includes('cooler')) {
    return 'cooler';
  }
  if (combined.includes('kasa') || combined.includes('case')) {
    return 'pcCase';
  }
  return 'ram';
}

function buildFallbackXmlOrJsonFeed(store: StoreBotPlatform): {
  format: 'xml' | 'json';
  payload: string;
} {
  const ref = (id: string, fallback: number) =>
    REFERENCE_RATES[id]?.estimatedNewTry ?? fallback;

  if (store === 'Vatan') {
    const p7500 = computeStorePrice(ref('cpu-r5-7500f', 6500), 1.02);
    const p4060ti = computeStorePrice(ref('gpu-rtx4060ti', 16900), 1.03);
    const p4070s = computeStorePrice(ref('gpu-rtx4070-super', 26800), 1.01);
    const p990 = computeStorePrice(ref('ssd-1tb-pro', 4100), 1.02);
    const pTufB650 = computeStorePrice(8450, 1.0);

    return {
      format: 'xml',
      payload: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <item>
      <g:title>AMD Ryzen 5 7500F 3.7GHz 32MB Önbellek 6 Çekirdek AM5 İşlemci</g:title>
      <g:brand>AMD</g:brand>
      <g:product_type>İşlemci</g:product_type>
      <g:price>${p7500} TRY</g:price>
      <g:link>https://www.vatanbilgisayar.com/amd-ryzen-5-7500f-3-7ghz-am5.html</g:link>
    </item>
    <item>
      <g:title>MSI GeForce RTX 4060 Ti 8GB GDDR6 128Bit DLSS 3 Ekran Kartı</g:title>
      <g:brand>MSI</g:brand>
      <g:product_type>Ekran Kartı</g:product_type>
      <g:price>${p4060ti} TRY</g:price>
      <g:link>https://www.vatanbilgisayar.com/msi-geforce-rtx-4060-ti-8gb.html</g:link>
    </item>
    <item>
      <g:title>ASUS Dual GeForce RTX 4070 Super OC 12GB GDDR6X Ekran Kartı</g:title>
      <g:brand>ASUS</g:brand>
      <g:product_type>Ekran Kartı</g:product_type>
      <g:price>${p4070s} TRY</g:price>
      <g:link>https://www.vatanbilgisayar.com/asus-geforce-rtx-4070-super-12gb.html</g:link>
    </item>
    <item>
      <g:title>Samsung 990 PRO 1 TB NVMe PCIe 4.0 M.2 SSD</g:title>
      <g:brand>Samsung</g:brand>
      <g:product_type>SSD</g:product_type>
      <g:price>${p990} TRY</g:price>
      <g:link>https://www.vatanbilgisayar.com/samsung-990-pro-1tb-nvme-ssd.html</g:link>
    </item>
    <item>
      <g:title>ASUS ROG STRIX B650E-F GAMING WIFI AM5 DDR5 ATX Anakart</g:title>
      <g:brand>ASUS</g:brand>
      <g:product_type>Anakart</g:product_type>
      <g:description>AM5 Soket · DDR5 8000MHz+ OC · PCIe 5.0 x16 &amp; M.2 · Wi-Fi 6E · ATX</g:description>
      <g:price>${pTufB650} TRY</g:price>
      <g:link>https://www.vatanbilgisayar.com/asus-rog-strix-b650e-f-gaming-wifi-am5.html</g:link>
    </item>
  </channel>
</rss>`,
    };
  }

  if (store === 'İtopya') {
    const p7500 = computeStorePrice(ref('cpu-r5-7500f', 6500), 0.98);
    const p7800x3d = computeStorePrice(ref('cpu-r7-7800x3d', 15800), 1.0);
    const p4060 = computeStorePrice(ref('gpu-rtx4060', 13200), 1.0);
    const pB650 = computeStorePrice(ref('mb-b650-atx', 7450), 1.01);
    const pCorsairRam = computeStorePrice(5250, 1.0);
    const pNzxtCase = computeStorePrice(4750, 1.0);

    return {
      format: 'xml',
      payload: `<?xml version="1.0" encoding="UTF-8"?>
<products>
  <product>
    <name>AMD Ryzen 5 7500F 3.7GHz 6 Çekirdek AM5 MPK İşlemci</name>
    <brand>AMD</brand>
    <category>İşlemci</category>
    <price>${p7500}</price>
    <url>https://www.itopya.com/amd-ryzen-5-7500f-am5-islemci</url>
  </product>
  <product>
    <name>AMD Ryzen 7 7800X3D 4.2GHz 96MB 3D V-Cache AM5 İşlemci</name>
    <brand>AMD</brand>
    <category>İşlemci</category>
    <price>${p7800x3d}</price>
    <url>https://www.itopya.com/amd-ryzen-7-7800x3d-am5-islemci</url>
  </product>
  <product>
    <name>MSI GeForce RTX 4060 Ventus 2X Black 8GB OC Ekran Kartı</name>
    <brand>MSI</brand>
    <category>Ekran Kartı</category>
    <price>${p4060}</price>
    <url>https://www.itopya.com/msi-geforce-rtx-4060-ventus-2x-8gb</url>
  </product>
  <product>
    <name>MSI B650 Gaming Plus Wi-Fi ATX AM5 DDR5 Anakart</name>
    <brand>MSI</brand>
    <category>Anakart</category>
    <price>${pB650}</price>
    <url>https://www.itopya.com/msi-b650-gaming-plus-wifi-am5-anakart</url>
  </product>
  <product>
    <name>Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz CL36 Bellek</name>
    <brand>Corsair</brand>
    <category>RAM</category>
    <description>DDR5 · 2x16 GB Çift Kanal · 6000 MHz CL36 · Intel XMP &amp; AMD EXPO</description>
    <price>${pCorsairRam}</price>
    <url>https://www.itopya.com/corsair-vengeance-rgb-32gb-ddr5-6000mhz</url>
  </product>
  <product>
    <name>NZXT H6 Flow Temperli Cam ATX Mid-Tower Kasa</name>
    <brand>NZXT</brand>
    <category>Bilgisayar Kasası</category>
    <description>Çift Odacıklı Airflow · 365 mm GPU Desteği · 360 mm Radyatör Uyumlu</description>
    <price>${pNzxtCase}</price>
    <url>https://www.itopya.com/nzxt-h6-flow-atx-kasa</url>
  </product>
</products>`,
    };
  }

  if (store === 'Sinerji') {
    const p14400f = computeStorePrice(ref('cpu-i5-14400f', 7400), 0.99);
    const p4060ti = computeStorePrice(ref('gpu-rtx4060ti', 16900), 0.99);
    const p7800xt = computeStorePrice(ref('gpu-rx7800xt', 22900), 0.98);
    const pFlare = computeStorePrice(ref('ram-32-d5', 4850), 0.99);
    const pMsiPsu = computeStorePrice(5850, 1.0);

    return {
      format: 'json',
      payload: JSON.stringify({
        products: [
          {
            name: 'Intel Core i5-14400F 2.5GHz 20MB Önbellek 10 Çekirdek LGA1700 İşlemci',
            brand: 'Intel',
            category: 'İşlemci',
            price: p14400f,
            url: 'https://www.sinerji.gen.tr/intel-core-i5-14400f-islemci',
          },
          {
            name: 'ASUS Dual GeForce RTX 4060 Ti OC 8GB GDDR6 Ekran Kartı',
            brand: 'ASUS',
            category: 'Ekran Kartı',
            price: p4060ti,
            url: 'https://www.sinerji.gen.tr/asus-dual-geforce-rtx-4060-ti-8gb',
          },
          {
            name: 'Sapphire AMD Radeon RX 7800 XT Pulse 16GB GDDR6 Ekran Kartı',
            brand: 'Sapphire',
            category: 'Ekran Kartı',
            price: p7800xt,
            url: 'https://www.sinerji.gen.tr/sapphire-radeon-rx-7800-xt-pulse-16gb',
          },
          {
            name: 'G.Skill 32 GB (2x16) Flare X5 DDR5 6000 MHz CL30 EXPO RAM',
            brand: 'G.Skill',
            category: 'RAM',
            price: pFlare,
            url: 'https://www.sinerji.gen.tr/gskill-32gb-2x16-flare-x5-ddr5-6000mhz',
          },
          {
            name: 'MSI MAG A850GL PCIE5 850W 80+ Gold Tam Modüler Güç Kaynağı',
            brand: 'MSI',
            category: 'Güç Kaynağı (PSU)',
            description: '850W · 80+ Gold · ATX 3.0 & PCIe 5.0 12VHPWR · Tam Modüler',
            price: pMsiPsu,
            url: 'https://www.sinerji.gen.tr/msi-mag-a850gl-pcie5-850w-80-gold-psu',
          },
        ],
      }),
    };
  }

  // Trendyol
  const pFurySsd = computeStorePrice(6400, 1.0);
  const pCooler = computeStorePrice(1650, 1.0);
  const pCorsairRamTrendyol = computeStorePrice(5350, 1.01);
  return {
    format: 'xml',
    payload: `<?xml version="1.0" encoding="UTF-8"?>
<products>
  <urun>
    <urun_adi>Kingston Fury Renegade 2TB PCIe 4.0 NVMe M.2 SSD</urun_adi>
    <marka>Kingston</marka>
    <kategori>SSD</kategori>
    <aciklama>2 TB · PCIe 4.0 NVMe · 7300 MB/sn Okuma · Soğutuculu</aciklama>
    <fiyat>${pFurySsd}</fiyat>
    <url>https://www.trendyol.com/kingston/fury-renegade-2tb-nvme-ssd</url>
  </urun>
  <urun>
    <urun_adi>Arctic Liquid Freezer III 360 ARGB Sıvı İşlemci Soğutucu</urun_adi>
    <marka>Arctic</marka>
    <kategori>Soğutucu</kategori>
    <aciklama>360 mm Radyatör · VRM Fanlı Pompa · AM5 / LGA1700 Uyumlu</aciklama>
    <fiyat>${pCooler}</fiyat>
    <url>https://www.trendyol.com/arctic/liquid-freezer-iii-360-argb</url>
  </urun>
  <urun>
    <urun_adi>Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz CL36 Bellek</urun_adi>
    <marka>Corsair</marka>
    <kategori>RAM</kategori>
    <aciklama>DDR5 · 2x16 GB Çift Kanal · 6000 MHz CL36 · Intel XMP &amp; AMD EXPO</aciklama>
    <fiyat>${pCorsairRamTrendyol}</fiyat>
    <url>https://www.trendyol.com/corsair/vengeance-rgb-32gb-ddr5-6000mhz</url>
  </urun>
</products>`,
  };
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
            `[PriceBot] ${source.store} feed yanıtı başarısız (${response.status}), yedek besleme kullanılıyor.`
          );
          const fallback = buildFallbackXmlOrJsonFeed(source.store);
          collected.push(
            ...parseStoreFeedPayload(fallback.payload, fallback.format, source.store)
          );
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
        const fallback = buildFallbackXmlOrJsonFeed(source.store);
        collected.push(
          ...parseStoreFeedPayload(fallback.payload, fallback.format, source.store)
        );
      }
    } catch (error) {
      console.warn(
        `[PriceBot] ${source.store} feed okuma hatası, yedek besleme kullanılıyor:`,
        error
      );
      const fallback = buildFallbackXmlOrJsonFeed(source.store);
      collected.push(
        ...parseStoreFeedPayload(fallback.payload, fallback.format, source.store)
      );
    }
  }

  return collected;
}

export function buildMockStoreFeed(): ExternalFeedItem[] {
  const sources = getConfiguredFeedSources();
  const list: ExternalFeedItem[] = [];
  for (const source of sources) {
    const fallback = buildFallbackXmlOrJsonFeed(source.store);
    list.push(...parseStoreFeedPayload(fallback.payload, fallback.format, source.store));
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
