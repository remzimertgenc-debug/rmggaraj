import type {
  MarketPriceStats,
  MarketplaceListing,
  MarketplacePlatform,
  PartCategoryKey,
  ZeroVsUsedComparison,
} from '../../src/types/pc.ts';

function computeMedian(sortedAsc: number[]): number {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sortedAsc[mid];
  return Math.round((sortedAsc[mid - 1] + sortedAsc[mid]) / 2);
}

/**
 * Birden fazla ilan için aykırı/şüpheli ilanları (aşırı düşük sahte fiyat vb.) tespit edip
 * normal piyasa hesabından çıkarır; en düşük, medyan, ortalama ve ilan sayısını hesaplar.
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
        outlierReason: 'Geçersiz veya sıfır TL tutarlı ilan',
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
        outlierReason: `Medyan piyasa değerinin aşırı üzerinde aykırı ilan`,
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

const RISK_BY_CATEGORY: Record<PartCategoryKey, { advantage: string; risk: string }> = {
  cpu: {
    advantage: 'İşlemcilerde mekanik aşınma düşük olduğu için ikinci el fiyat avantajı yüksektir.',
    risk: 'Pin/ped hasarı, fatura eksikliği ve termal macun geçmişi kontrol edilmelidir.',
  },
  gpu: {
    advantage: 'En yüksek TL tasarrufunu sağlayan bileşendir; üst segment karta geçiş imkanı sunar.',
    risk: 'Yük altında sıcaklık, fan rulman sesi, mining geçmişi ve garanti durumu mutlaka test edilmelidir.',
  },
  motherboard: {
    advantage: 'Platform maliyetini düşürür; özellikle B/Z serisi kartlarda iyi fırsat sunar.',
    risk: 'Soket pin yamulması, USB/PCIe port sağlığı ve güncel BIOS durumu kontrol edilmelidir.',
  },
  ram: {
    advantage: 'Ömür boyu garanti sunan markalarda ikinci el bellekler bütçe dostudur.',
    risk: 'XMP/EXPO kararlılığı için MemTest doğrulaması önerilir.',
  },
  ssd: {
    advantage: 'Kısa süreli kullanımda fiyat düşüşü sağlayabilir.',
    risk: 'Yazma ömrü (TBW) yıpranması ve veri güvenliği nedeniyle kritik sistemlerde sıfır önerilir.',
  },
  psu: {
    advantage: 'Modüler üst seviye modeller daha uygun fiyata bulunabilir.',
    risk: 'Kapasitör yaşlanması ve eksik modüler kablo riski nedeniyle sıfır tercih edilmesi daha güvenlidir.',
  },
  pcCase: {
    advantage: 'Metal şasi yıpranmadığı için ikinci elde ciddi tasarruf sağlar.',
    risk: 'Cam panel çizikleri, vida seti eksikliği ve ön panel USB portları kontrol edilmelidir.',
  },
  cooler: {
    advantage: 'Kule tipi hava soğutucular ikinci elde neredeyse sıfır performansını korur.',
    risk: 'Sıvı soğutucularda pompa ömrü ve sıvı buharlaşma riski nedeniyle yaş kontrolü yapılmalıdır.',
  },
};

export function buildZeroVsUsedComparison(
  category: PartCategoryKey,
  newPriceTry: number | null,
  usedPriceTry: number | null,
  newSourceLabel: string,
  usedSourceLabel: string
): ZeroVsUsedComparison {
  const guidance = RISK_BY_CATEGORY[category];

  if (
    newPriceTry === null ||
    usedPriceTry === null ||
    newPriceTry <= 0
  ) {
    return {
      newPriceTry,
      usedPriceTry,
      differenceTry: null,
      savingsPercent: null,
      newSourceLabel,
      usedSourceLabel,
      advantageNote: guidance.advantage,
      riskNote: guidance.risk,
    };
  }

  const differenceTry = newPriceTry - usedPriceTry;
  const savingsPercent =
    newPriceTry > 0 ? Math.round((differenceTry / newPriceTry) * 100) : 0;

  return {
    newPriceTry,
    usedPriceTry,
    differenceTry,
    savingsPercent,
    newSourceLabel,
    usedSourceLabel,
    advantageNote:
      differenceTry > 0
        ? `İkinci el tercihi ~${new Intl.NumberFormat('tr-TR').format(
            differenceTry
          )} TL (%${savingsPercent}) maliyet avantajı sağlar. ${guidance.advantage}`
        : guidance.advantage,
    riskNote: guidance.risk,
  };
}
