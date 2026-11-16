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
  createDatabaseListing,
  deleteDatabaseListing,
  getDatabaseListings,
  getPartPriceHistory,
  type PriceHistoryPoint,
} from '../../src/db/listings.ts';
import { getDatabaseProducts } from '../../src/db/products.ts';
import type {
  DynamicCatalogProduct,
  MarketplaceListing,
  MarketplacePlatform,
  PartCategoryKey,
  PartPricingInfo,
  PriceSourceType,
  PricingCatalogResponse,
  ProductConditionGrade,
} from '../../src/types/pc.ts';
import { findMatchingPartId } from './matcher.ts';
import { REFERENCE_RATES } from './referenceRates.ts';
import { analyzeMarketplaceListings, buildZeroVsUsedComparison } from './stats.ts';

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

export interface NewListingInput {
  userId: number;
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

export async function addUserMarketplaceListing(
  input: NewListingInput
): Promise<MarketplaceListing> {
  const staticMeta = ALL_PARTS.find((p) => p.id === input.partId);
  let resolvedMeta: AllPartMeta | undefined = staticMeta;

  if (!resolvedMeta) {
    const dbProducts = await getDatabaseProducts();
    const dynMatch = dbProducts.find((p) => p.id === input.partId);
    if (dynMatch) {
      resolvedMeta = {
        id: dynMatch.id,
        model: dynMatch.name,
        brand: dynMatch.brand,
        category: dynMatch.category,
      };
    }
  }

  if (!resolvedMeta && input.productName) {
    const matchedId = findMatchingPartId(input.productName);
    if (matchedId) {
      resolvedMeta = ALL_PARTS.find((p) => p.id === matchedId);
    }
  }

  if (!resolvedMeta) {
    throw new Error('Geçersiz bileşen kimliği seçildi.');
  }

  const meta = resolvedMeta;

  const nowIso = new Date().toISOString();
  return await createDatabaseListing({
    userId: input.userId,
    partId: meta.id,
    productName: input.productName?.trim() || meta.model,
    brandModel: input.brandModel?.trim() || `${meta.brand} ${meta.model}`,
    listingPriceTry: Math.round(input.listingPriceTry),
    platform: input.platform,
    listingUrl: input.listingUrl.trim(),
    listingDate: input.listingDate || nowIso.slice(0, 10),
    conditionGrade: input.conditionGrade,
    isNew: Boolean(input.isNew),
  });
}

export async function deleteUserMarketplaceListing(
  id: string,
  userId: number
): Promise<'deleted' | 'not_found' | 'forbidden'> {
  return await deleteDatabaseListing(id, userId);
}

export async function fetchPartPriceHistory(
  partId: string,
  isNew?: boolean
): Promise<PriceHistoryPoint[]> {
  return await getPartPriceHistory(partId, isNew);
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
        statusMessage: `Yetkili fiyat API yanıtı başarısız (${response.status}). Veritabanı ilanları ve referans tahminleri kullanılıyor.`,
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
        'Yetkili fiyat API sağlayıcısına şu anda ulaşılamıyor. Veritabanındaki kayıtlı ilanlar ve referans tahminleri gösteriliyor.',
    };
  }
}

function hashCode(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function roundTo50(value: number): number {
  return Math.max(450, Math.round(value / 50) * 50);
}

function estimateReferenceRateForProduct(product: DynamicCatalogProduct): {
  estimatedNewTry: number;
  estimatedUsedTry: number;
} {
  const hay = `${product.name} ${product.specSummary}`.toUpperCase();
  const jitter = 0.93 + (hashCode(product.id) % 15) * 0.01; // 0.93 .. 1.07
  let baseNew = 4500;

  switch (product.category) {
    case 'cpu': {
      if (hay.includes('9950') || hay.includes('7950') || hay.includes('285K') || hay.includes('14900') || hay.includes('13900')) {
        baseNew = 24500;
      } else if (hay.includes('9900') || hay.includes('7900') || hay.includes('9800X3D') || hay.includes('5950')) {
        baseNew = 19800;
      } else if (hay.includes('265K') || hay.includes('14700') || hay.includes('13700') || hay.includes('12700') || hay.includes('9700X') || hay.includes('5800X3D')) {
        baseNew = 14800;
      } else if (hay.includes('5700X3D') || hay.includes('7700') || hay.includes('245K') || hay.includes('14600') || hay.includes('13600') || hay.includes('11900')) {
        baseNew = 11400;
      } else if (hay.includes('9600X') || hay.includes('7600') || hay.includes('225F') || hay.includes('5900X') || hay.includes('12600')) {
        baseNew = 7900;
      } else if (hay.includes('5600X') || hay.includes('5700X') || hay.includes('8400F') || hay.includes('8500G') || hay.includes('12400F') || hay.includes('11400F')) {
        baseNew = 5400;
      } else {
        baseNew = 3900;
      }
      break;
    }

    case 'gpu': {
      if (hay.includes('5090')) baseNew = 99500;
      else if (hay.includes('4090')) baseNew = 79500;
      else if (hay.includes('5080')) baseNew = 54500;
      else if (hay.includes('4080')) baseNew = 48500;
      else if (hay.includes('7900 XTX')) baseNew = 41500;
      else if (hay.includes('5070 TI') || hay.includes('4070 TI')) baseNew = 38500;
      else if (hay.includes('9070 XT')) baseNew = 31500;
      else if (hay.includes('5070')) baseNew = 29500;
      else if (hay.includes('9070') || hay.includes('4070 SUPER') || hay.includes('7900 GRE')) baseNew = 25900;
      else if (hay.includes('7800 XT')) baseNew = 22500;
      else if (hay.includes('5060 TI') && hay.includes('16GB')) baseNew = 21500;
      else if (hay.includes('9060 XT') && hay.includes('16GB')) baseNew = 18500;
      else if (hay.includes('5060 TI') || hay.includes('4060 TI')) baseNew = 17900;
      else if (hay.includes('5060')) baseNew = 15200;
      else if (hay.includes('9060 XT')) baseNew = 14800;
      else if (hay.includes('9060') || hay.includes('B580') || hay.includes('7600 XT')) baseNew = 12900;
      else if (hay.includes('5050') || hay.includes('B570') || hay.includes('4060')) baseNew = 11900;
      else baseNew = 10900;

      if (hay.includes('ROG STRIX') || hay.includes('AORUS') || hay.includes('NITRO+') || hay.includes('RED DEVIL') || hay.includes('ICHILL')) {
        baseNew *= 1.12;
      } else if (hay.includes('TUF') || hay.includes('GAMING X') || hay.includes('GAMING TRIO') || hay.includes('HELLHOUND')) {
        baseNew *= 1.06;
      }
      break;
    }

    case 'motherboard': {
      if (hay.includes('X870E') || hay.includes('Z890') || hay.includes('X670E')) baseNew = 15800;
      else if (hay.includes('X870') || hay.includes('Z790') || hay.includes('X670') || hay.includes('B650E')) baseNew = 11200;
      else if (hay.includes('Z690') || hay.includes('Z590') || hay.includes('Z490') || hay.includes('X570')) baseNew = 8900;
      else if (hay.includes('B850') || hay.includes('B860') || hay.includes('B650') || hay.includes('B760')) baseNew = 6400;
      else if (hay.includes('B660') || hay.includes('B550') || hay.includes('B560') || hay.includes('A620') || hay.includes('B840') || hay.includes('H810')) baseNew = 4350;
      else baseNew = 2750;

      if (hay.includes('ROG') || hay.includes('TAICHI') || hay.includes('CARBON') || hay.includes('AORUS PRO')) baseNew *= 1.25;
      else if (hay.includes('TUF') || hay.includes('TOMAHAWK') || hay.includes('MORTAR') || hay.includes('AORUS') || hay.includes('STEEL LEGEND')) baseNew *= 1.12;
      break;
    }

    case 'ram': {
      const capMatch = hay.match(/\b(16|32|48|64|96|128)\s*GB\b/);
      const gb = capMatch ? Number(capMatch[1]) : 32;
      const isDdr5 = (product.ramType ?? hay).includes('DDR5');
      const perGb = isDdr5 ? 148 : 92;
      baseNew = gb * perGb;
      if (hay.includes('RGB')) baseNew *= 1.12;
      if (hay.includes('7200') || hay.includes('6400')) baseNew *= 1.14;
      if (hay.includes('DOMINATOR') || hay.includes('TRIDENT Z5') || hay.includes('RENEGADE')) baseNew *= 1.12;
      break;
    }

    case 'ssd': {
      const tbMatch = hay.match(/\b([1248])\s*TB\b/);
      const tb = tbMatch ? Number(tbMatch[1]) : 0.5;
      const isGen5 = hay.includes('PCIE 5.0');
      const isGen4 = hay.includes('PCIE 4.0');
      baseNew = tb * (isGen5 ? 4600 : isGen4 ? 2650 : 1950);
      break;
    }

    case 'psu': {
      const watts = product.wattage ?? 650;
      baseNew = watts * 6.2;
      if (hay.includes('PLATINUM')) baseNew *= 1.32;
      else if (hay.includes('GOLD')) baseNew *= 1.15;
      if (hay.includes('ATX 3.1')) baseNew *= 1.08;
      break;
    }

    case 'pcCase': {
      if (hay.includes('FULL-TOWER') || hay.includes('XL')) baseNew = 6100;
      else if (hay.includes('AKVARYUM') || hay.includes('VISION')) baseNew = 4850;
      else if (hay.includes('AIRFLOW')) baseNew = 3750;
      else baseNew = 2850;
      if (hay.includes('BEYAZ')) baseNew *= 1.05;
      break;
    }

    case 'cooler': {
      if (hay.includes('360MM')) baseNew = 4850;
      else if (hay.includes('240MM')) baseNew = 3450;
      else if (hay.includes('ÇİFT KULE') || hay.includes('CIFT KULE')) baseNew = 2150;
      else baseNew = 1250;
      if (hay.includes('NOCTUA') || hay.includes('CORSAIR') || hay.includes('NZXT') || hay.includes('LIAN LI')) baseNew *= 1.18;
      break;
    }
  }

  const estimatedNewTry = roundTo50(baseNew * jitter);
  const estimatedUsedTry = roundTo50(estimatedNewTry * 0.72);
  return { estimatedNewTry, estimatedUsedTry };
}

export async function getPricingCatalog(
  requestingUserId?: number
): Promise<PricingCatalogResponse> {
  const [apiResult, dbListings, dbProducts] = await Promise.all([
    fetchFromAuthorizedApi(),
    getDatabaseListings(requestingUserId),
    getDatabaseProducts(),
  ]);

  const combinedRawListings = [...apiResult.listings, ...dbListings];
  const listingsByPartId = new Map<string, MarketplaceListing[]>();
  for (const listing of combinedRawListings) {
    const arr = listingsByPartId.get(listing.partId);
    if (arr) arr.push(listing);
    else listingsByPartId.set(listing.partId, [listing]);
  }

  const staticIds = new Set(ALL_PARTS.map((p) => p.id));
  const dynamicProducts: DynamicCatalogProduct[] = dbProducts.filter(
    (p) => !staticIds.has(p.id) && !p.isCatalogCore
  );
  const productImages: Record<string, string> = {};
  const dbProductById = new Map<string, DynamicCatalogProduct>();
  for (const prod of dbProducts) {
    dbProductById.set(prod.id, prod);
    if (prod.imageUrl) {
      productImages[prod.id] = prod.imageUrl;
    }
  }

  const seenPartIds = new Set<string>();
  const allCatalogAndDynamicParts: AllPartMeta[] = [];
  for (const p of ALL_PARTS) {
    seenPartIds.add(p.id);
    allCatalogAndDynamicParts.push(p);
  }
  for (const d of dbProducts) {
    if (!seenPartIds.has(d.id)) {
      seenPartIds.add(d.id);
      allCatalogAndDynamicParts.push({
        id: d.id,
        model: d.name,
        brand: d.brand,
        category: d.category,
      });
    }
  }

  const partsPricing: Record<string, PartPricingInfo> = {};
  const processedAllListings: MarketplaceListing[] = [];

  for (const part of allCatalogAndDynamicParts) {
    const dbProd = dbProductById.get(part.id);
    const ref =
      REFERENCE_RATES[part.id] ??
      (dbProd ? estimateReferenceRateForProduct(dbProd) : undefined);
    const partRawListings = listingsByPartId.get(part.id) ?? [];
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
    dynamicProducts,
    catalogProducts: dbProducts,
    productImages,
  };
}
