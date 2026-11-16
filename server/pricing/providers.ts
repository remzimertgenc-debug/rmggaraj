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
  getDatabaseListings,
  getPartPriceHistory,
  type PriceHistoryPoint,
} from '../../src/db/listings.ts';
import { getDatabaseProducts } from '../../src/db/products.ts';
import type {
  DynamicCatalogProduct,
  MarketplaceListing,
  PartCategoryKey,
  PartPricingInfo,
  PriceSourceType,
  PricingCatalogResponse,
} from '../../src/types/pc.ts';
import { estimateReferenceRateForPart, REFERENCE_RATES } from './referenceRates.ts';
import { analyzeMarketplaceListings } from './stats.ts';

interface AllPartMeta {
  id: string;
  model: string;
  brand: string;
  category: PartCategoryKey;
  specSummary: string;
  ramType?: string | null;
  wattage?: number | null;
}

const ALL_PARTS: AllPartMeta[] = [
  ...CPU_DB.map((p) => ({
    id: p.id,
    model: p.model,
    brand: p.brand,
    category: 'cpu' as const,
    specSummary: p.specSummary,
    ramType: p.supportedRam.join(','),
  })),
  ...GPU_DB.map((p) => ({
    id: p.id,
    model: p.model,
    brand: p.brand,
    category: 'gpu' as const,
    specSummary: p.specSummary,
    wattage: p.recommendedPsuWatts,
  })),
  ...MOTHERBOARD_DB.map((p) => ({
    id: p.id,
    model: p.model,
    brand: p.brand,
    category: 'motherboard' as const,
    specSummary: p.specSummary,
    ramType: p.supportedRam,
  })),
  ...RAM_DB.map((p) => ({
    id: p.id,
    model: p.model,
    brand: p.brand,
    category: 'ram' as const,
    specSummary: p.specSummary,
    ramType: p.generation,
  })),
  ...SSD_DB.map((p) => ({
    id: p.id,
    model: p.model,
    brand: p.brand,
    category: 'ssd' as const,
    specSummary: p.specSummary,
  })),
  ...PSU_DB.map((p) => ({
    id: p.id,
    model: p.model,
    brand: p.brand,
    category: 'psu' as const,
    specSummary: p.specSummary,
    wattage: p.wattage,
  })),
  ...CASE_DB.map((p) => ({
    id: p.id,
    model: p.model,
    brand: p.brand,
    category: 'pcCase' as const,
    specSummary: p.specSummary,
  })),
  ...CPU_COOLER_DB.map((p) => ({
    id: p.id,
    model: p.model,
    brand: p.brand,
    category: 'cooler' as const,
    specSummary: p.specSummary,
    wattage: p.maxTdpCapacityWatts,
  })),
];

export async function fetchPartPriceHistory(
  partId: string,
  isNew = true
): Promise<PriceHistoryPoint[]> {
  return await getPartPriceHistory(partId, isNew);
}

/**
 * İzinli mağaza fiyat API sağlayıcısından (PRICE_API_BASE_URL + PRICE_API_KEY)
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
        'Yetkili mağaza fiyat akışları ve doğrulanmış referans veriler üzerinden yalnızca sıfır ürün karşılaştırması sunulur.',
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



export async function getPricingCatalog(
  requestingUserId?: number
): Promise<PricingCatalogResponse> {
  const [apiResult, dbListings, dbProducts] = await Promise.all([
    fetchFromAuthorizedApi(),
    getDatabaseListings(requestingUserId),
    getDatabaseProducts(),
  ]);

  const combinedRawListings = [...apiResult.listings, ...dbListings].filter(
    (listing) => listing.isNew
  );
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
        specSummary: d.specSummary,
        ramType: d.ramType,
        wattage: d.wattage,
      });
    }
  }

  const partsPricing: Record<string, PartPricingInfo> = {};
  const processedAllListings: MarketplaceListing[] = [];

  for (const part of allCatalogAndDynamicParts) {
    const dbProd = dbProductById.get(part.id);
    const ref =
      REFERENCE_RATES[part.id] ??
      estimateReferenceRateForPart(
        dbProd ?? {
          id: part.id,
          category: part.category,
          name: part.model,
          specSummary: part.specSummary,
          ramType: part.ramType,
          wattage: part.wattage,
        }
      );
    const partRawListings = listingsByPartId.get(part.id) ?? [];
    const newRaw = partRawListings.filter((l) => l.isNew);

    const newAnalysis = analyzeMarketplaceListings(
      newRaw,
      ref?.estimatedNewTry ?? null
    );

    processedAllListings.push(...newAnalysis.processedListings);

    let newPriceTry: number | null = ref?.estimatedNewTry ?? null;
    let newSourceType: PriceSourceType =
      newPriceTry !== null ? 'estimated_reference' : 'unavailable';
    let newSourceLabel =
      newPriceTry === 0
        ? 'Dahili / Kutu İçeriği (Ek Maliyet Yok)'
        : 'Referans sıfır piyasa tahmini';

    if (newAnalysis.stats) {
      newPriceTry = newAnalysis.stats.medianPriceTry;
      newSourceType = apiResult.listings.some((l) => l.partId === part.id && l.isNew)
        ? 'authorized_api'
        : 'user_listings';
      newSourceLabel = `${newAnalysis.stats.sources.join(' / ')} (${
        newAnalysis.stats.listingCount
      } mağaza medyanı)`;
    }

    const lastCheckedAt = newAnalysis.stats?.lastCheckedAt ?? null;

    partsPricing[part.id] = {
      partId: part.id,
      newPriceTry,
      newStats: newAnalysis.stats,
      newSourceType,
      newSourceLabel,
      lastCheckedAt,
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
