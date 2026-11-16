import type {
  MarketPriceStats,
  MarketplaceListing,
  MarketplacePlatform,
} from '../../src/types/pc.ts';

function computeMedian(sortedAsc: number[]): number {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sortedAsc[mid];
  return Math.round((sortedAsc[mid - 1] + sortedAsc[mid]) / 2);
}

/**
 * Birden fazla mağaza fiyatı için aykırı/şüpheli fiyatları tespit edip
 * normal piyasa hesabından çıkarır; en düşük, medyan, ortalama ve mağaza sayısını hesaplar.
 */
export function analyzeMarketplaceListings(
  listings: MarketplaceListing[],
  baselineExpectedTry: number | null
): {
  processedListings: MarketplaceListing[];
  stats: MarketPriceStats | null;
} {
  if (listings.length === 0) {
    return { processedListings: [], stats: null };
  }

  const prices = listings
    .map((l) => l.listingPriceTry)
    .filter((p) => Number.isFinite(p) && p > 0)
    .sort((a, b) => a - b);

  const rawMedian = computeMedian(prices);
  const anchor =
    listings.length >= 3
      ? rawMedian
      : baselineExpectedTry && baselineExpectedTry > 0
        ? baselineExpectedTry
        : rawMedian;

  const processedListings = listings.map((item) => {
    if (!Number.isFinite(item.listingPriceTry) || item.listingPriceTry <= 0) {
      return {
        ...item,
        isSuspiciousOutlier: true,
        outlierReason: 'Geçersiz veya sıfır TL tutarlı fiyat',
      };
    }

    if (anchor > 0 && item.listingPriceTry < anchor * 0.45) {
      return {
        ...item,
        isSuspiciousOutlier: true,
        outlierReason: `Referans/medyan seviyenin (%45 altı) aşırı altında şüpheli düşük fiyat`,
      };
    }

    if (anchor > 0 && listings.length >= 3 && item.listingPriceTry > anchor * 1.9) {
      return {
        ...item,
        isSuspiciousOutlier: true,
        outlierReason: `Medyan piyasa değerinin aşırı üzerinde aykırı fiyat`,
      };
    }

    return {
      ...item,
      isSuspiciousOutlier: false,
      outlierReason: undefined,
    };
  });

  const valid = processedListings.filter((l) => !l.isSuspiciousOutlier);
  const excludedOutlierCount = processedListings.length - valid.length;

  if (valid.length === 0) {
    return { processedListings, stats: null };
  }

  const validPrices = valid.map((l) => l.listingPriceTry).sort((a, b) => a - b);
  const sum = validPrices.reduce((acc, p) => acc + p, 0);
  const uniqueSources: MarketplacePlatform[] = Array.from(
    new Set(valid.map((l) => l.platform))
  );
  const latestCheck = valid
    .map((l) => l.lastCheckedAt)
    .sort()
    .reverse()[0];

  return {
    processedListings,
    stats: {
      minPriceTry: validPrices[0],
      medianPriceTry: computeMedian(validPrices),
      averagePriceTry: Math.round(sum / validPrices.length),
      listingCount: valid.length,
      excludedOutlierCount,
      sources: uniqueSources,
      lastCheckedAt: latestCheck,
    },
  };
}

