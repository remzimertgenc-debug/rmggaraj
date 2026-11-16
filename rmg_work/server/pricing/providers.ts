import fs from 'node:fs';
import path from 'node:path';
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
import type {
  MarketplaceListing,
  MarketplacePlatform,
  PartCategoryKey,
  PartPricingInfo,
  PriceSourceType,
  PricingCatalogResponse,
  ProductConditionGrade,
} from '../../src/types/pc.ts';
import { REFERENCE_RATES } from './referenceRates.ts';
import { analyzeMarketplaceListings, buildZeroVsUsedComparison } from './stats.ts';

const STORE_DIR = path.resolve(process.cwd(), 'server/data');
const STORE_FILE = path.join(STORE_DIR, 'userListings.json');

interface AllPartMeta {
  id: string;
  model: string;
  brand: string;
  category: PartCategoryKey;
}

const ALL_PARTS: AllPartMeta[] = [
  ...CPU_DB.map((p) => ({ id: p.id, model: p.model, brand: p.brand, category: 'cpu' as const })),
  ...GPU_DB.map((p) => ({ id: p.id, model: p.model, brand: p.brand, category: 'gpu' as const })),
  ...MOTHERBOARD_DB.map((p) => ({
    id: p.id,
    model: p.model,
    brand: p.brand,
    category: 'motherboard' as const,
  })),
  ...RAM_DB.map((p) => ({ id: p.id, model: p.model, brand: p.brand, category: 'ram' as const })),
  ...SSD_DB.map((p) => ({ id: p.id, model: p.model, brand: p.brand, category: 'ssd' as const })),
  ...PSU_DB.map((p) => ({ id: p.id, model: p.model, brand: p.brand, category: 'psu' as const })),
  ...CASE_DB.map((p) => ({
    id: p.id,
    model: p.model,
    brand: p.brand,
    category: 'pcCase' as const,
  })),
  ...CPU_COOLER_DB.map((p) => ({
    id: p.id,
    model: p.model,
    brand: p.brand,
    category: 'cooler' as const,
  })),
];

function ensureStoreLoaded(): MarketplaceListing[] {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStore(listings: MarketplaceListing[]): void {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(listings, null, 2), 'utf-8');
  } catch {
    // Salt okunur dosya sistemi durumunda bellek içi liste devam eder
  }
}

let inMemoryListings: MarketplaceListing[] = ensureStoreLoaded();

export interface NewListingInput {
  partId: string;
  productName?: string;
  brandModel?: string;
  listingPriceTry: number;
  platform: MarketplacePlatform;
  listingUrl: string;
  listingDate: string;
  conditionGrade: ProductConditionGrade;
  isNew: boolean;
}

export function addUserMarketplaceListing(input: NewListingInput): MarketplaceListing {
  const meta = ALL_PARTS.find((p) => p.id === input.partId);
  if (!meta) {
    throw new Error('Geçersiz bileşen kimliği seçildi.');
  }

  const nowIso = new Date().toISOString();
  const record: MarketplaceListing = {
    id: `lst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    partId: meta.id,
    productName: input.productName?.trim() || meta.model,
    brandModel: input.brandModel?.trim() || `${meta.brand} ${meta.model}`,
    listingPriceTry: Math.round(input.listingPriceTry),
    platform: input.platform,
    listingUrl: input.listingUrl.trim(),
    listingDate: input.listingDate || nowIso.slice(0, 10),
    conditionGrade: input.conditionGrade,
    isNew: Boolean(input.isNew),
    lastCheckedAt: nowIso,
  };

  inMemoryListings = [record, ...inMemoryListings];
  saveStore(inMemoryListings);
  return record;
}

export function deleteUserMarketplaceListing(id: string): boolean {
  const before = inMemoryListings.length;
  inMemoryListings = inMemoryListings.filter((l) => l.id !== id);
  if (inMemoryListings.length !== before) {
    saveStore(inMemoryListings);
    return true;
  }
  return false;
}

/**
 * İzinli pazar yeri API sağlayıcısından (PRICE_API_BASE_URL + PRICE_API_KEY)
 * veri almayı dener. İzinsiz scraping veya CAPTCHA aşma yöntemleri kesinlikle kullanılmaz.
 */
async function fetchFromAuthorizedApi(): Promise<{
  configured: boolean;
  listings: MarketplaceListing[];
  statusMessage: string;
}> {
  const baseUrl = process.env.PRICE_API_BASE_URL?.trim();
  const apiKey = process.env.PRICE_API_KEY?.trim();

  if (!baseUrl || !apiKey) {
    return {
      configured: false,
      listings: [],
      statusMessage:
        'Harici yetkili pazar yeri API bağlantısı yapılandırılmadı. Gerçek ilan verisi için aşağıdan ilan kaydı ekleyebilirsiniz; ilan girilmeyen bileşenlerde yalnızca referans bütçe tahmini gösterilir.',
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/listings`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        configured: true,
        listings: [],
        statusMessage: `Yetkili fiyat API yanıtı başarısız (${response.status}). Kullanıcı ilanları ve referans tahminleri kullanılıyor.`,
      };
    }

    const payload = (await response.json()) as { listings?: MarketplaceListing[] };
    const apiListings = Array.isArray(payload.listings) ? payload.listings : [];
    return {
      configured: true,
      listings: apiListings,
      statusMessage: `Yetkili pazar yeri API bağlantısı aktif (${apiListings.length} ilan senkronize edildi).`,
    };
  } catch {
    return {
      configured: true,
      listings: [],
      statusMessage:
        'Yetkili fiyat API sağlayıcısına şu anda ulaşılamıyor. Gerçek ilan yerine referans tahminleri ve kayıtlı kullanıcı ilanları gösteriliyor.',
    };
  }
}

export async function getPricingCatalog(): Promise<PricingCatalogResponse> {
  const apiResult = await fetchFromAuthorizedApi();
  const combinedRawListings = [...apiResult.listings, ...inMemoryListings];

  const partsPricing: Record<string, PartPricingInfo> = {};
  const processedAllListings: MarketplaceListing[] = [];

  for (const part of ALL_PARTS) {
    const ref = REFERENCE_RATES[part.id];
    const partRawListings = combinedRawListings.filter((l) => l.partId === part.id);
    const newRaw = partRawListings.filter((l) => l.isNew);
    const usedRaw = partRawListings.filter((l) => !l.isNew);

    const newAnalysis = analyzeMarketplaceListings(
      newRaw,
      ref?.estimatedNewTry ?? null
    );
    const usedAnalysis = analyzeMarketplaceListings(
      usedRaw,
      ref?.estimatedUsedTry ?? null
    );

    processedAllListings.push(
      ...newAnalysis.processedListings,
      ...usedAnalysis.processedListings
    );

    let newPriceTry: number | null = ref?.estimatedNewTry ?? null;
    let newSourceType: PriceSourceType =
      newPriceTry !== null ? 'estimated_reference' : 'unavailable';
    let newSourceLabel =
      newPriceTry === 0
        ? 'Dahili / Kutu İçeriği (Ek Maliyet Yok)'
        : 'Gerçek ilan yok — Referans bütçe tahmini';

    if (newAnalysis.stats) {
      newPriceTry = newAnalysis.stats.medianPriceTry;
      newSourceType = apiResult.listings.some((l) => l.partId === part.id && l.isNew)
        ? 'authorized_api'
        : 'user_listings';
      newSourceLabel = `${newAnalysis.stats.sources.join(' / ')} (${
        newAnalysis.stats.listingCount
      } ilan medyanı)`;
    }

    let usedPriceTry: number | null = ref?.estimatedUsedTry ?? null;
    let usedSourceType: PriceSourceType =
      usedPriceTry !== null ? 'estimated_reference' : 'unavailable';
    let usedSourceLabel =
      usedPriceTry === 0
        ? 'Dahili / Kutu İçeriği (Ek Maliyet Yok)'
        : 'Gerçek ilan yok — Referans ikinci el tahmini';

    if (usedAnalysis.stats) {
      usedPriceTry = usedAnalysis.stats.medianPriceTry;
      usedSourceType = apiResult.listings.some((l) => l.partId === part.id && !l.isNew)
        ? 'authorized_api'
        : 'user_listings';
      usedSourceLabel = `${usedAnalysis.stats.sources.join(' / ')} (${
        usedAnalysis.stats.listingCount
      } ilan medyanı)`;
    }

    const lastCheckedAt =
      usedAnalysis.stats?.lastCheckedAt ??
      newAnalysis.stats?.lastCheckedAt ??
      null;

    partsPricing[part.id] = {
      partId: part.id,
      newPriceTry,
      usedPriceTry,
      newStats: newAnalysis.stats,
      usedStats: usedAnalysis.stats,
      newSourceType,
      usedSourceType,
      newSourceLabel,
      usedSourceLabel,
      lastCheckedAt,
      comparison: buildZeroVsUsedComparison(
        part.category,
        newPriceTry,
        usedPriceTry,
        newSourceLabel,
        usedSourceLabel
      ),
    };
  }

  return {
    providerStatus: {
      authorizedApiConfigured: apiResult.configured,
      providerMessage: apiResult.statusMessage,
      lastSyncedAt: new Date().toISOString(),
    },
    partsPricing,
    listings: processedAllListings,
  };
}
