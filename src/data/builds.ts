import {
  BuilderPreferences,
  BuildTier,
  ComponentSpec,
  CoolerPart,
  CpuBrandPreference,
  CpuPart,
  GpuBrandPreference,
  GpuPart,
  MotherboardPart,
  PartCategoryKey,
  PartPricingInfo,
  PcBuild,
  PriceSourceType,
  PricingCatalogResponse,
  RamPart,
  SelectedPartIds,
  SsdPart,
  TargetResolution,
  UsagePurpose,
} from '../types/pc';
import { evaluateCompatibility } from '../utils/compatibility';
import {
  CASE_DB,
  CPU_COOLER_DB,
  CPU_DB,
  GPU_DB,
  MOTHERBOARD_DB,
  PSU_DB,
  RAM_DB,
  SSD_DB,
} from './hardwareDb';
import { getMergedCatalogParts } from './catalogAdapter';

export const BUILD_IMAGES: Record<BuildTier | 'hero', string> = {
  hero: '/src/assets/images/hero_custom_pc_rig_1794757633660.jpg',
  'fiyat-performans': '/src/assets/images/build_price_performance_1794757634823.jpg',
  'yuksek-performans': '/src/assets/images/build_max_performance_1794757634829.jpg',
  'butce-dostu': '/src/assets/images/build_budget_friendly_1794757634366.jpg',
};

export const WHITE_STUDIO_CASE_IMAGES = {
  compact: '/src/assets/images/pc_case_white_compact_1794784488206.jpg',
  esports: '/src/assets/images/pc_case_white_esports_1794784488314.jpg',
  aquarium: '/src/assets/images/pc_case_white_aquarium_1794784489210.jpg',
  flagship: '/src/assets/images/pc_case_white_flagship_1794784490063.jpg',
} as const;

export function getReadySystemCaseImage(
  build: Pick<PcBuild, 'id' | 'tier' | 'suitedPurposes' | 'systemName'>
): string {
  const hay = `${build.id} ${build.systemName}`.toLowerCase();
  if (hay.includes('creator') || build.suitedPurposes.includes('tasarim') || build.suitedPurposes.includes('yayin')) {
    return WHITE_STUDIO_CASE_IMAGES.aquarium;
  }
  if (hay.includes('apex') || hay.includes('4k') || build.tier === 'yuksek-performans') {
    return WHITE_STUDIO_CASE_IMAGES.flagship;
  }
  if (hay.includes('espor') || hay.includes('pulse') || build.tier === 'fiyat-performans') {
    return WHITE_STUDIO_CASE_IMAGES.esports;
  }
  return WHITE_STUDIO_CASE_IMAGES.compact;
}

export const HARDWARE_STUDIO_IMAGES = {
  interior: '/src/assets/images/pc_interior_gpu_angle_1794762765498.jpg',
  gpu: '/src/assets/images/gpu_product_studio_1794762766377.jpg',
  cpu: '/src/assets/images/cpu_product_studio_1794762765866.jpg',
};

export function getBuildGallery(build: PcBuild): { src: string; label: string }[] {
  return [
    { src: build.image, label: 'Kasa Dış Görünüm' },
    { src: HARDWARE_STUDIO_IMAGES.interior, label: 'Kasa İçi Donanım' },
    { src: HARDWARE_STUDIO_IMAGES.gpu, label: 'Ekran Kartı Detay' },
  ];
}

export const POPULAR_GAMES: string[] = [
  'Valorant',
  'Counter-Strike 2',
  'League of Legends',
  'Fortnite',
  'PUBG: Battlegrounds',
  'Apex Legends',
  'GTA V',
  'Forza Horizon 5',
  "Baldur's Gate 3",
  'Red Dead Redemption 2',
  'Cyberpunk 2077',
  'Alan Wake 2',
];

export const ESPORTS_GAMES = new Set([
  'Valorant',
  'Counter-Strike 2',
  'League of Legends',
  'Fortnite',
  'PUBG: Battlegrounds',
  'Apex Legends',
]);

export const HEAVY_AAA_GAMES = new Set([
  'Cyberpunk 2077',
  'Red Dead Redemption 2',
  "Baldur's Gate 3",
  'Alan Wake 2',
  'Forza Horizon 5',
]);

export const PURPOSE_OPTIONS: {
  id: UsagePurpose;
  title: string;
  description: string;
}[] = [
  {
    id: 'oyun',
    title: 'Oyun',
    description: 'Yüksek FPS, akıcı kare hızı ve düşük gecikme odaklı ekran kartı ağırlıklı denge.',
  },
  {
    id: 'yayin',
    title: 'Yayın',
    description: 'Oyun ve canlı yayını aynı anda yürüten çok çekirdekli işlemci ve NVENC kodlayıcı.',
  },
  {
    id: 'tasarim',
    title: 'Tasarım',
    description: '3B modelleme, video kurgu ve renk işleme için yüksek VRAM ve geniş bellek.',
  },
  {
    id: 'ofis',
    title: 'Ofis',
    description: 'Sessiz çalışma, düşük güç tüketimi, hızlı NVMe tepkisi ve çoklu görev verimliliği.',
  },
];

export const RESOLUTION_OPTIONS: {
  id: TargetResolution;
  title: string;
  subtitle: string;
}[] = [
  {
    id: '1080p',
    title: '1080p Full HD',
    subtitle: 'Rekabetçi FPS ve yüksek Hz monitörler için ideal',
  },
  {
    id: '1440p',
    title: '1440p 2K QHD',
    subtitle: 'Keskin görüntü ile yüksek kare hızının dengesi',
  },
  {
    id: '4k',
    title: '4K Ultra HD',
    subtitle: 'Üst düzey detay ve sinematik görsel kalite',
  },
];

export const CPU_BRAND_OPTIONS: { id: CpuBrandPreference; title: string; subtitle: string }[] = [
  { id: 'farketmez', title: 'Farketmez', subtitle: 'Bütçe ve performansa göre en iyi eşleşme' },
  { id: 'amd', title: 'AMD Ryzen', subtitle: 'AM4 / AM5 platform ve 3D V-Cache odağı' },
  { id: 'intel', title: 'Intel Core', subtitle: 'LGA1700 / LGA1851 hibrit ve Core Ultra mimari' },
];

export const GPU_BRAND_OPTIONS: { id: GpuBrandPreference; title: string; subtitle: string }[] = [
  { id: 'farketmez', title: 'Farketmez', subtitle: 'Çözünürlük hedefine göre en verimli GPU' },
  { id: 'nvidia', title: 'NVIDIA GeForce', subtitle: 'DLSS 3, ışın izleme ve NVENC desteği' },
  { id: 'amd', title: 'AMD Radeon', subtitle: 'Yüksek saf VRAM kapasitesi ve fiyat verimliliği' },
];

export const BUDGET_PRESETS = [25000, 40000, 60000, 90000, 125000];

export function formatTry(amount: number): string {
  return new Intl.NumberFormat('tr-TR').format(Math.round(amount)) + ' TL';
}

function getPricingForPart(
  partId: string,
  catalog: PricingCatalogResponse | null
): {
  price: number;
  newPrice: number;
  sourceType: PriceSourceType;
  sourceSummary: string;
  listingCount: number;
  excludedOutlierCount: number;
  lastCheckedAt: string | null;
  info: PartPricingInfo | undefined;
} {
  const info = catalog?.partsPricing[partId];

  if (!info) {
    return {
      price: 0,
      newPrice: 0,
      sourceType: 'unavailable',
      sourceSummary: 'Fiyat veri kaynağı yüklenmedi',
      listingCount: 0,
      excludedOutlierCount: 0,
      lastCheckedAt: null,
      info: undefined,
    };
  }

  const newPrice = info.newPriceTry ?? 0;
  const stats = info.newStats;
  return {
    price: newPrice,
    newPrice,
    sourceType: info.newSourceType,
    sourceSummary: info.newSourceLabel,
    listingCount: stats?.listingCount ?? 0,
    excludedOutlierCount: stats?.excludedOutlierCount ?? 0,
    lastCheckedAt: stats?.lastCheckedAt ?? info.lastCheckedAt,
    info,
  };
}

function getResolutionDisplay(res: TargetResolution): string {
  return res === '4k'
    ? '4K Ultra HD'
    : res === '1440p'
      ? '1440p 2K QHD'
      : '1080p Full HD';
}

function analyzeGameProfile(games: string[]) {
  const esportsCount = games.filter((g) => ESPORTS_GAMES.has(g)).length;
  const heavyCount = games.filter((g) => HEAVY_AAA_GAMES.has(g)).length;
  const customCount = games.filter(
    (g) => !ESPORTS_GAMES.has(g) && !HEAVY_AAA_GAMES.has(g)
  ).length;
  const prefersEsports = esportsCount > heavyCount + customCount;
  const prefersHeavyAaa = heavyCount + customCount > 0;
  return { esportsCount, heavyCount, prefersEsports, prefersHeavyAaa };
}

function buildPartReasons(
  prefs: BuilderPreferences,
  tier: BuildTier,
  cpu: CpuPart,
  gpu: GpuPart,
  mb: MotherboardPart,
  ram: RamPart,
  ssd: SsdPart,
  psu: { model: string; wattage: number | null; atxStandard: string },
  pcCase: { model: string; maxGpuLengthMm: number | null },
  cooler: CoolerPart
): Record<PartCategoryKey, string> {
  const resLabel = getResolutionDisplay(prefs.resolution);
  const { prefersEsports, prefersHeavyAaa } = analyzeGameProfile(prefs.favoriteGames);
  const gamesHint =
    prefs.favoriteGames.length > 0
      ? prefs.favoriteGames.slice(0, 2).join(' ve ')
      : 'güncel yapımlar';

  const tierText =
    tier === 'butce-dostu'
      ? 'bütçe tasarrufu'
      : tier === 'yuksek-performans'
        ? 'maksimum performans'
        : 'fiyat/performans dengesi';

  const cpuFocus =
    prefs.purpose === 'yayin'
      ? 'oyun ve canlı yayını aynı anda yürütmek'
      : prefs.purpose === 'tasarim'
        ? 'tasarım, kurgu ve çok çekirdekli render hızı'
        : prefs.purpose === 'ofis'
          ? 'sessiz ve hızlı ofis çoklu görevi'
          : prefersEsports
            ? `${gamesHint} gibi işlemci odaklı oyunlarda ${resLabel} çözünürlükte yüksek FPS korumak`
            : `${gamesHint} için ${resLabel} çözünürlükte ekran kartını dengeli beslemek`;

  const gpuReason = gpu.isIntegrated
    ? `${resLabel} ofis ekranlarında sessiz çalışması ve bütçeyi koruması için dahili grafik birimi seçildi.`
    : `Seçilen ${resLabel} hedefinde ${gamesHint} için ${
        gpu.vramGb ?? '?'
      } GB VRAM ve ${
        prefs.purpose === 'yayin' && gpu.supportsNvenc
          ? 'donanımsal NVENC yayın kodlayıcı'
          : tierText
      } dengesiyle seçildi.`;

  const ssdCapLabel =
    ssd.capacityGb >= 1000 ? `${ssd.capacityGb / 1000} TB` : `${ssd.capacityGb} GB`;

  return {
    cpu: `${cpuFocus} amacıyla ${cpu.cores} çekirdekli ${cpu.socket} platformunda ${tierText} odağıyla seçildi.`,
    gpu: gpuReason,
    motherboard: `${cpu.socket} soketini, ${cpu.generation ?? ''} BIOS desteğini ve ${cpu.maxPowerWatts ?? '?'}W turbo gücü karşılayan ${mb.vrmMaxCpuWatts ?? '?'}W VRM kapasitesini sunduğu için seçildi.`,
    ram: `${mb.supportedRam ?? ram.generation} yapısıyla uyumlu; ${
      prefs.purpose === 'tasarim' || prefs.purpose === 'yayin'
        ? 'yayın ve tasarım iş yüklerinde bellek daralmasını önleyen'
        : prefersHeavyAaa
          ? `${resLabel} oyun sahneleri için yeterli`
          : 'çift kanal bant genişliği sunan'
    } ${ram.capacityGb ?? ''} GB (${ram.speedMhz ?? ''} MHz) kit seçildi.`,
    ssd: `${
      prefersHeavyAaa && ssd.capacityGb >= 1000
        ? 'Büyük oyun dosyaları ve'
        : 'İşletim sistemi ile'
    } ${
      prefs.purpose === 'ofis' ? 'belge açılışlarında' : `${resLabel} içerik yüklemelerinde`
    } hızlı tepki için ${ssdCapLabel} ${ssd.interfaceType} NVMe seçildi.`,
    psu: `${cpu.maxPowerWatts ?? '?'}W maks. CPU + ${gpu.peakPowerWatts ?? 0}W tepe GPU tüketimi için güvenli %25 pay ve gerekli güç kablolarını sunan ${
      psu.wattage ?? '?'
    }W (${psu.atxStandard}) seçildi.`,
    pcCase: `${mb.formFactor} anakart, ${
      gpu.isIntegrated
        ? 'kompakt yerleşim'
        : `${gpu.lengthMm ?? '?'} mm GPU uzunluğu (${pcCase.maxGpuLengthMm ?? '?'} mm alan)`
    } ve soğutucu açıklığı doğrulandığı için seçildi.`,
    cooler: `${cpu.model} işlemcisinin ${cpu.maxPowerWatts ?? '?'}W maksimum yükünü termal kısılma olmadan soğutmak için ${cooler.maxTdpCapacityWatts ?? '?'}W kapasiteli ${cooler.coolerType} seçildi.`,
  };
}

function buildPerformanceNote(
  tier: BuildTier,
  prefs: BuilderPreferences,
  gpu: GpuPart
): string {
  const resText = getResolutionDisplay(prefs.resolution);
  const sampleGames =
    prefs.favoriteGames.length > 0
      ? prefs.favoriteGames.slice(0, 3).join(', ')
      : 'güncel yapımlar';

  if (prefs.purpose === 'ofis') {
    if (tier === 'butce-dostu') {
      return `${resText} çözünürlükte günlük ofis yazılımları, tarayıcı sekmeleri ve video toplantılar için sessiz, ekonomik kurgu.`;
    }
    if (tier === 'fiyat-performans') {
      return `${resText} çoklu ekranlı iş akışları, büyük tablolar ve hızlı veri aktarımı için dengeli sistem.`;
    }
    return `${resText} çalışma alanlarında yoğun kurumsal projeler ve kesintisiz çoklu görev için üst seviye iş istasyonu.`;
  }

  const vram = gpu.vramGb ?? 8;
  const scaleAdvice =
    prefs.resolution === '4k' && vram < 16
      ? ' (4K hedefte akıcılık için DLSS/FSR ölçekleme önerilir)'
      : prefs.resolution === '1440p' && vram < 12
        ? ' (1440p hedefte optimize grafik ayarları ile dengeli FPS hedeflenir)'
        : '';

  if (tier === 'butce-dostu') {
    return `${sampleGames} için ${resText} hedefinde bütçeyi koruyarak akıcı performans sunan ekonomik sistem${scaleAdvice}.`;
  }
  if (tier === 'fiyat-performans') {
    return `${sampleGames} başta olmak üzere ${resText} çözünürlükte yüksek grafik dengesi ve fiyat verimliliği sunan sistem${scaleAdvice}.`;
  }
  return `${sampleGames} dahil en zorlu yapımlarda seçilen ${resText} hedefi için bütçe sınırları içindeki en yüksek performanslı sistem${scaleAdvice}.`;
}

export function assembleBuildFromIds(
  tier: BuildTier,
  ids: SelectedPartIds,
  prefs: BuilderPreferences,
  catalog: PricingCatalogResponse | null,
  isCustomized = false
): PcBuild {
  const merged = getMergedCatalogParts(catalog);
  const cpu = merged.cpus.find((p) => p.id === ids.cpuId) ?? CPU_DB[0];
  const gpu = merged.gpus.find((p) => p.id === ids.gpuId) ?? GPU_DB[1];
  const motherboard =
    merged.motherboards.find((p) => p.id === ids.motherboardId) ?? MOTHERBOARD_DB[0];
  const ram = merged.rams.find((p) => p.id === ids.ramId) ?? RAM_DB[0];
  const ssd = merged.ssds.find((p) => p.id === ids.ssdId) ?? SSD_DB[0];
  const psu = merged.psus.find((p) => p.id === ids.psuId) ?? PSU_DB[0];
  const pcCase = merged.cases.find((p) => p.id === ids.caseId) ?? CASE_DB[0];
  const cooler =
    merged.coolers.find((p) => p.id === ids.coolerId) ?? CPU_COOLER_DB[0];

  const cpuP = getPricingForPart(cpu.id, catalog);
  const gpuP = getPricingForPart(gpu.id, catalog);
  const mbP = getPricingForPart(motherboard.id, catalog);
  const ramP = getPricingForPart(ram.id, catalog);
  const ssdP = getPricingForPart(ssd.id, catalog);
  const psuP = getPricingForPart(psu.id, catalog);
  const caseP = getPricingForPart(pcCase.id, catalog);
  const coolerP = getPricingForPart(cooler.id, catalog);

  const allPricings = [cpuP, gpuP, mbP, ramP, ssdP, psuP, caseP, coolerP];
  const calculatedTotalTry = allPricings.reduce((acc, item) => acc + item.price, 0);
  const allNewTotalTry = allPricings.reduce((acc, item) => acc + item.newPrice, 0);
  const bundleSavingsTry = Math.max(0, allNewTotalTry - calculatedTotalTry);
  const bundleSavingsPercent =
    allNewTotalTry > 0 ? Math.round((bundleSavingsTry / allNewTotalTry) * 100) : 0;

  const hasRealListingData = allPricings.some(
    (p) => p.sourceType === 'authorized_api' || p.sourceType === 'user_listings'
  );

  const compatibility = evaluateCompatibility({
    cpu,
    gpu,
    motherboard,
    ram,
    psu,
    pcCase,
    cooler,
  });

  const reasons = buildPartReasons(
    prefs,
    tier,
    cpu,
    gpu,
    motherboard,
    ram,
    ssd,
    psu,
    pcCase,
    cooler
  );

  const tierMeta: Record<BuildTier, { title: string; subtitle: string; prefix: string }> = {
    'fiyat-performans': {
      title: 'En İyi Fiyat / Performans',
      subtitle: 'Bütçe Verimliliği ve İdeal Güç Dengesi',
      prefix: 'RMG Pulse',
    },
    'yuksek-performans': {
      title: 'En Yüksek Performans',
      subtitle: 'Bütçe Dahilinde Maksimum Güç Hedefi',
      prefix: 'RMG Apex',
    },
    'butce-dostu': {
      title: 'Bütçe Dostu',
      subtitle: 'Erişilebilir Başlangıç ve Yüksek Tasarruf',
      prefix: 'RMG Spark',
    },
  };

  const systemName = `${tierMeta[tier].prefix} ${gpu.shortTitle}${
    isCustomized ? ' (Özel)' : ''
  }`;

  const diff = prefs.budget - calculatedTotalTry;
  const isWithinBudget = diff >= 0;
  const budgetStatusText = isWithinBudget
    ? diff === 0
      ? 'Seçilen bütçe sınırıyla tam eşleşiyor'
      : `Bütçenin ${formatTry(diff)} altında`
    : `Taban bileşen maliyeti bütçeyi ${formatTry(Math.abs(diff))} aşıyor`;

  const makeSpec = (
    partId: string,
    category: PartCategoryKey,
    label: string,
    model: string,
    detail: string,
    p: ReturnType<typeof getPricingForPart>,
    reason: string
  ): ComponentSpec => ({
    partId,
    category,
    label,
    model,
    detail,
    priceTry: p.price,
    priceSourceType: p.sourceType,
    priceSourceSummary: p.sourceSummary,
    listingCount: p.listingCount,
    excludedOutlierCount: p.excludedOutlierCount,
    lastCheckedAt: p.lastCheckedAt,
    selectionReason: reason,
  });

  return {
    id: `rmg-${tier}-${cpu.id}-${gpu.id}-${cooler.id}-${prefs.resolution}`,
    tier,
    tierTitle: tierMeta[tier].title,
    tierSubtitle: tierMeta[tier].subtitle,
    systemName,
    image: BUILD_IMAGES[tier],
    samplePriceTry: calculatedTotalTry,
    hasRealListingData,
    allNewTotalTry,
    bundleSavingsTry,
    bundleSavingsPercent,
    budgetStatusText,
    isWithinBudget,
    estimatedWattage: compatibility.realisticPeakDrawWatts,
    recommendedPsuWatts: compatibility.recommendedPsuWatts,
    targetResolution: prefs.resolution,
    suitedPurposes: [prefs.purpose],
    selectedIds: {
      cpuId: cpu.id,
      gpuId: gpu.id,
      motherboardId: motherboard.id,
      ramId: ram.id,
      ssdId: ssd.id,
      psuId: psu.id,
      caseId: pcCase.id,
      coolerId: cooler.id,
    },
    cpu: makeSpec(cpu.id, 'cpu', 'İşlemci (CPU)', cpu.model, cpu.specSummary, cpuP, reasons.cpu),
    gpu: makeSpec(gpu.id, 'gpu', 'Ekran Kartı (GPU)', gpu.model, gpu.specSummary, gpuP, reasons.gpu),
    motherboard: makeSpec(
      motherboard.id,
      'motherboard',
      'Anakart',
      motherboard.model,
      motherboard.specSummary,
      mbP,
      reasons.motherboard
    ),
    ram: makeSpec(ram.id, 'ram', 'Bellek (RAM)', ram.model, ram.specSummary, ramP, reasons.ram),
    ssd: makeSpec(ssd.id, 'ssd', 'SSD Depolama', ssd.model, ssd.specSummary, ssdP, reasons.ssd),
    psu: makeSpec(psu.id, 'psu', 'Güç Kaynağı (PSU)', psu.model, psu.specSummary, psuP, reasons.psu),
    pcCase: makeSpec(
      pcCase.id,
      'pcCase',
      'Bilgisayar Kasası',
      pcCase.model,
      pcCase.specSummary,
      caseP,
      reasons.pcCase
    ),
    cooler: makeSpec(
      cooler.id,
      'cooler',
      'İşlemci Soğutucusu',
      cooler.model,
      cooler.specSummary,
      coolerP,
      reasons.cooler
    ),
    compatibility,
    performanceNote: buildPerformanceNote(tier, prefs, gpu),
    isCustomized,
  };
}

interface CandidateBuild {
  ids: SelectedPartIds;
  price: number;
  score: number;
  cpu: CpuPart;
  gpu: GpuPart;
}

function getGpuResolutionScore(gpu: GpuPart, res: TargetResolution): number {
  if (res === '4k') return gpu.score4k;
  if (res === '1440p') return gpu.score1440p;
  return gpu.score1080p;
}

function generateVerifiedCandidates(
  prefs: BuilderPreferences,
  catalog: PricingCatalogResponse | null
): CandidateBuild[] {
  const priceOf = (id: string) => getPricingForPart(id, catalog).price;

  const cpus = CPU_DB.filter((p) => !p.isUnverifiedSpecSample)
    .filter((c) => {
      if (prefs.cpuBrandPref === 'amd') return c.brand === 'AMD';
      if (prefs.cpuBrandPref === 'intel') return c.brand === 'Intel';
      return true;
    })
    .filter((c) => !catalog || priceOf(c.id) > 0);

  const filteredGpus = GPU_DB.filter((p) => !p.isUnverifiedSpecSample)
    .filter((g) => (prefs.purpose === 'ofis' ? true : !g.isIntegrated))
    .filter((g) => {
      if (g.isIntegrated) return true;
      const modelLower = g.model.toLowerCase();
      if (prefs.gpuBrandPref === 'nvidia') {
        return g.brand === 'NVIDIA' || modelLower.includes('geforce') || modelLower.includes('rtx');
      }
      if (prefs.gpuBrandPref === 'amd') {
        return g.brand === 'AMD' || modelLower.includes('radeon') || /\brx\b/.test(modelLower);
      }
      return true;
    })
    .filter((g) => g.isIntegrated || !catalog || priceOf(g.id) > 0);

  // Her GPU yonga + VRAM katmanı için en uygun fiyatlı temsilciyi seç (aday aramasını O(N) tutar)
  const gpuRepMap = new Map<string, GpuPart>();
  const sortedGpusByPrice = [...filteredGpus].sort((a, b) => priceOf(a.id) - priceOf(b.id));
  for (const g of sortedGpusByPrice) {
    const key = g.isIntegrated ? g.id : `${g.shortTitle}::${g.vramGb ?? 0}`;
    if (!gpuRepMap.has(key)) {
      gpuRepMap.set(key, g);
    }
  }
  const gpus = Array.from(gpuRepMap.values());

  const byPriceAsc = <T extends { id: string }>(arr: T[]) =>
    arr.filter((p) => !('isUnverifiedSpecSample' in p && (p as { isUnverifiedSpecSample?: boolean }).isUnverifiedSpecSample))
      .sort((a, b) => priceOf(a.id) - priceOf(b.id));

  const motherboards = byPriceAsc(MOTHERBOARD_DB);
  const rams = byPriceAsc(RAM_DB);
  const sortedSsds = byPriceAsc(SSD_DB);
  const psus = byPriceAsc(PSU_DB);
  const cases = byPriceAsc(CASE_DB);
  const coolers = byPriceAsc(CPU_COOLER_DB);

  const { prefersEsports, prefersHeavyAaa } = analyzeGameProfile(prefs.favoriteGames);
  const preferredSsd =
    (prefersHeavyAaa || prefs.purpose === 'tasarim') &&
    sortedSsds.some((s) => s.capacityGb >= 1000)
      ? sortedSsds.find((s) => s.capacityGb >= 1000) ?? sortedSsds[0]
      : sortedSsds[0];

  const candidates: CandidateBuild[] = [];

  for (const cpu of cpus) {
    const validBoards = motherboards.filter(
      (mb) =>
        mb.socket === cpu.socket &&
        cpu.generation !== null &&
        mb.nativeCpuGenerations.includes(cpu.generation) &&
        cpu.maxPowerWatts !== null &&
        mb.vrmMaxCpuWatts !== null &&
        cpu.maxPowerWatts <= mb.vrmMaxCpuWatts
    );

    if (validBoards.length === 0) continue;

    const boardOptions =
      validBoards.length > 1
        ? [validBoards[0], validBoards[validBoards.length - 1]]
        : [validBoards[0]];

    const cooler = coolers.find(
      (cl) =>
        cl.supportedSockets.includes(cpu.socket) &&
        cpu.maxPowerWatts !== null &&
        cl.maxTdpCapacityWatts !== null &&
        cl.maxTdpCapacityWatts >= cpu.maxPowerWatts &&
        (!cpu.requiresDedicatedCooler || cl.coolerType !== 'Stok / Giriş')
    );

    if (!cooler) continue;

    for (const mb of boardOptions) {
      const validRams = rams.filter(
        (r) =>
          r.generation === mb.supportedRam &&
          r.modulesCount !== null &&
          mb.ramSlots !== null &&
          r.modulesCount <= mb.ramSlots &&
          r.capacityGb !== null &&
          mb.maxRamGb !== null &&
          r.capacityGb <= mb.maxRamGb &&
          r.speedMhz !== null &&
          mb.maxRamSpeedMhz !== null &&
          r.speedMhz <= mb.maxRamSpeedMhz
      );

      if (validRams.length === 0) continue;

      const preferredRam =
        prefs.purpose === 'tasarim' || prefs.purpose === 'yayin'
          ? validRams.find((r) => (r.capacityGb ?? 0) >= 32) ?? validRams[validRams.length - 1]
          : validRams[0];
      const highRam = validRams.find((r) => (r.capacityGb ?? 0) >= 32) ?? validRams[validRams.length - 1];
      const ramOptions =
        preferredRam.id === highRam.id ? [preferredRam] : [preferredRam, highRam];

      for (const ram of ramOptions) {
        const ssd = preferredSsd;

        for (const gpu of gpus) {
          if (
            gpu.isIntegrated &&
            (!cpu.hasIntegratedGraphics || gpu.brand !== cpu.brand)
          ) {
            continue;
          }

          const validCase = cases.find((c) => {
            if (!c.supportedFormFactors.includes(mb.formFactor)) return false;
            if (
              !gpu.isIntegrated &&
              (gpu.lengthMm === null ||
                c.maxGpuLengthMm === null ||
                gpu.lengthMm > c.maxGpuLengthMm ||
                gpu.widthSlots === null ||
                c.expansionSlots === null ||
                gpu.widthSlots > c.expansionSlots)
            ) {
              return false;
            }
            if (cooler.coolerType === 'Sıvı Soğutma') {
              return (
                cooler.radiatorMm !== null &&
                c.supportedRadiatorMm.includes(cooler.radiatorMm)
              );
            }
            return (
              cooler.heightMm !== null &&
              c.maxCoolerHeightMm !== null &&
              cooler.heightMm <= c.maxCoolerHeightMm
            );
          });

          if (!validCase) continue;

          const validPsu = psus.find((p) => {
            const check = evaluateCompatibility({
              cpu,
              gpu,
              motherboard: mb,
              ram,
              psu: p,
              pcCase: validCase,
              cooler,
            });
            return check.overallStatus === 'verified';
          });

          if (!validPsu) continue;

          const ids: SelectedPartIds = {
            cpuId: cpu.id,
            gpuId: gpu.id,
            motherboardId: mb.id,
            ramId: ram.id,
            ssdId: ssd.id,
            psuId: validPsu.id,
            caseId: validCase.id,
            coolerId: cooler.id,
          };

          const cpuPrice = priceOf(cpu.id);
          const gpuPrice = priceOf(gpu.id);

          const price =
            cpuPrice +
            gpuPrice +
            priceOf(mb.id) +
            priceOf(ram.id) +
            priceOf(ssd.id) +
            priceOf(validPsu.id) +
            priceOf(validCase.id) +
            priceOf(cooler.id);

          // Dengeli bütçe dağılımı kontrolü (GPU/CPU aşırı dengesizliğini sert cezalandır)
          const tierGap = Math.abs(gpu.tierLevel - cpu.tierLevel);
          const balancePenalty =
            prefs.purpose === 'ofis'
              ? 0
              : tierGap > 1
                ? (tierGap - 1) * 32
                : 0;

          const gpuScore = getGpuResolutionScore(gpu, prefs.resolution);
          let score = 0;

          if (prefs.purpose === 'ofis') {
            score =
              cpu.productivityScore * 0.55 +
              (ram.capacityGb ?? 16) * 0.6 +
              (ssd.capacityGb >= 1000 ? 12 : 4) +
              (gpu.isIntegrated ? 18 : gpuScore * 0.15);
          } else if (prefs.purpose === 'tasarim') {
            score =
              cpu.productivityScore * 0.45 +
              gpuScore * 0.4 +
              (gpu.vramGb ?? 0) * 1.4 +
              (ram.capacityGb ?? 16) * 0.45 +
              (gpu.supportsNvenc ? 8 : 0) -
              balancePenalty;
          } else if (prefs.purpose === 'yayin') {
            score =
              cpu.productivityScore * 0.35 +
              cpu.gamingScore * 0.25 +
              gpuScore * 0.4 +
              (gpu.supportsNvenc ? 12 : 0) +
              (ram.capacityGb ?? 16) * 0.3 -
              balancePenalty;
          } else {
            const cpuWeight = prefersEsports && prefs.resolution === '1080p' ? 0.42 : 0.28;
            const gpuWeight = 1 - cpuWeight;
            const vramBonus =
              prefs.resolution === '4k'
                ? (gpu.vramGb ?? 0) >= 16
                  ? 14
                  : 0
                : prefs.resolution === '1440p'
                  ? (gpu.vramGb ?? 0) >= 12
                    ? 10
                    : 0
                  : 0;
            const heavyBonus = prefersHeavyAaa ? (gpu.vramGb ?? 0) * 0.6 : 0;
            score =
              cpu.gamingScore * cpuWeight +
              gpuScore * gpuWeight +
              vramBonus +
              heavyBonus +
              ((ram.capacityGb ?? 16) >= 32 ? 5 : 0) -
              balancePenalty;
          }

          candidates.push({ ids, price, score, cpu, gpu });
        }
      }
    }
  }

  return candidates;
}

/**
 * Aynı bileşenleri gereksiz yere tekrarlamadan 3 farklı doğrulanmış sistem önerir:
 * 1. En İyi Fiyat / Performans
 * 2. En Yüksek Performans
 * 3. Bütçe Dostu
 */
export function generateSampleBuilds(
  prefs: BuilderPreferences,
  catalog: PricingCatalogResponse | null
): PcBuild[] {
  const candidates = generateVerifiedCandidates(prefs, catalog);
  if (candidates.length === 0) {
    const fallbackIds: SelectedPartIds = {
      cpuId: 'cpu-r5-5600',
      gpuId: 'gpu-rx6600',
      motherboardId: 'mb-b550m',
      ramId: 'ram-16-d4',
      ssdId: 'ssd-500-gen3',
      psuId: 'psu-550-bronze',
      caseId: 'case-matx-compact',
      coolerId: 'cooler-ak400',
    };
    return [
      assembleBuildFromIds('fiyat-performans', fallbackIds, prefs, catalog),
      assembleBuildFromIds('yuksek-performans', fallbackIds, prefs, catalog),
      assembleBuildFromIds('butce-dostu', fallbackIds, prefs, catalog),
    ];
  }

  const sortedByPrice = [...candidates].sort((a, b) => a.price - b.price);
  const userBudget = Math.max(15000, prefs.budget);
  const withinBudget = candidates.filter((c) => c.price <= userBudget);
  const rawPool = withinBudget.length > 0 ? withinBudget : sortedByPrice.slice(0, 5);
  const balancedPool =
    prefs.purpose === 'ofis'
      ? rawPool
      : rawPool.filter((c) => Math.abs(c.gpu.tierLevel - c.cpu.tierLevel) <= 1);
  const pool = balancedPool.length >= 3 ? balancedPool : rawPool;

  // 1. En Yüksek Performans (Bütçe dahilindeki en yüksek skorlu dengeli sistem)
  const maxPerfCandidate = [...pool].sort(
    (a, b) => b.score - a.score || b.price - a.price
  )[0];

  // 2. Bütçe Dostu (Ekonomik alt bant — En Yüksek Performans'tan belirgin biçimde ucuz)
  const budgetUpper = Math.min(
    maxPerfCandidate.price - 3000,
    Math.max(sortedByPrice[0]?.price ?? userBudget, userBudget * 0.72)
  );
  const budgetEfficiency = (c: CandidateBuild) =>
    c.score / Math.pow(Math.max(10000, c.price), 0.55);

  const budgetDistinctPool = pool.filter(
    (c) =>
      c.price <= budgetUpper &&
      c.ids.gpuId !== maxPerfCandidate.ids.gpuId &&
      c.ids.cpuId !== maxPerfCandidate.ids.cpuId
  );
  const budgetDistinctGpuPool = pool.filter(
    (c) => c.price <= budgetUpper && c.ids.gpuId !== maxPerfCandidate.ids.gpuId
  );
  const budgetFallbackPool = pool.filter((c) => c.price < maxPerfCandidate.price);
  const budgetCandidate =
    budgetDistinctPool.length > 0
      ? [...budgetDistinctPool].sort(
          (a, b) => budgetEfficiency(b) - budgetEfficiency(a) || a.price - b.price
        )[0]
      : budgetDistinctGpuPool.length > 0
        ? [...budgetDistinctGpuPool].sort(
            (a, b) => budgetEfficiency(b) - budgetEfficiency(a) || a.price - b.price
          )[0]
        : budgetFallbackPool.length > 0
          ? [...budgetFallbackPool].sort((a, b) => a.price - b.price)[0]
          : [...pool].sort((a, b) => a.price - b.price)[0];

  // 3. En İyi Fiyat / Performans (Bütçe Dostu ile En Yüksek Performans arasında yer alan ve Bütçe Dostu'ndan daha yüksek performanslı sistem)
  const midLow = Math.min(maxPerfCandidate.price, budgetCandidate.price + 500);
  const midHigh = Math.max(midLow, maxPerfCandidate.price - 500);

  const valueScore = (c: CandidateBuild) =>
    c.score / Math.pow(Math.max(10000, c.price), 0.35);

  const midBothDistinctPool = pool.filter(
    (c) =>
      c.price >= midLow &&
      c.price <= midHigh &&
      c.score >= budgetCandidate.score &&
      c.ids.gpuId !== maxPerfCandidate.ids.gpuId &&
      c.ids.gpuId !== budgetCandidate.ids.gpuId &&
      c.ids.cpuId !== maxPerfCandidate.ids.cpuId
  );
  const midGpuDistinctPool = pool.filter(
    (c) =>
      c.price >= midLow &&
      c.price <= midHigh &&
      c.score >= budgetCandidate.score &&
      c.ids.gpuId !== maxPerfCandidate.ids.gpuId &&
      c.ids.gpuId !== budgetCandidate.ids.gpuId
  );
  const midAnyGpuPool = pool.filter(
    (c) =>
      c.price >= midLow &&
      c.price <= midHigh &&
      c.score >= budgetCandidate.score &&
      (c.ids.gpuId !== maxPerfCandidate.ids.gpuId ||
        c.ids.cpuId !== maxPerfCandidate.ids.cpuId) &&
      (c.ids.gpuId !== budgetCandidate.ids.gpuId ||
        c.ids.cpuId !== budgetCandidate.ids.cpuId)
  );

  let pricePerfCandidate =
    midBothDistinctPool.length > 0
      ? [...midBothDistinctPool].sort((a, b) => valueScore(b) - valueScore(a))[0]
      : midGpuDistinctPool.length > 0
        ? [...midGpuDistinctPool].sort((a, b) => valueScore(b) - valueScore(a))[0]
        : midAnyGpuPool.length > 0
          ? [...midAnyGpuPool].sort((a, b) => valueScore(b) - valueScore(a))[0]
          : undefined;

  if (!pricePerfCandidate) {
    const anyDistinctUnderMax = pool.filter(
      (c) =>
        c.price <= maxPerfCandidate.price &&
        c.score >= budgetCandidate.score &&
        c.ids.gpuId !== maxPerfCandidate.ids.gpuId &&
        c.ids.gpuId !== budgetCandidate.ids.gpuId
    );
    const anyDistinctPool = pool.filter(
      (c) =>
        c.ids.gpuId !== maxPerfCandidate.ids.gpuId &&
        c.ids.gpuId !== budgetCandidate.ids.gpuId
    );
    pricePerfCandidate =
      anyDistinctUnderMax.length > 0
        ? [...anyDistinctUnderMax].sort((a, b) => valueScore(b) - valueScore(a))[0]
        : anyDistinctPool.length > 0
          ? [...anyDistinctPool].sort((a, b) => valueScore(b) - valueScore(a))[0]
          : pool.find(
              (c) =>
                c.ids.cpuId !== maxPerfCandidate.ids.cpuId ||
                c.ids.gpuId !== maxPerfCandidate.ids.gpuId
            ) ?? maxPerfCandidate;
  }

  return [
    assembleBuildFromIds('fiyat-performans', pricePerfCandidate.ids, prefs, catalog),
    assembleBuildFromIds('yuksek-performans', maxPerfCandidate.ids, prefs, catalog),
    assembleBuildFromIds('butce-dostu', budgetCandidate.ids, prefs, catalog),
  ];
}

export interface CompatibleCatalogResult {
  builds: PcBuild[];
  totalVerifiedPoolCount: number;
  usedBudgetFallback: boolean;
}

/**
 * Bütçe, kullanım amacı, oyun ve görüntü tercihlerine göre
 * %100 uyumlu parçalardan oluşan çeşitli sistem kataloğu üretir.
 */
export function generateCompatibleCatalogBuilds(
  prefs: BuilderPreferences,
  catalog: PricingCatalogResponse | null,
  limit = 12
): CompatibleCatalogResult {
  const candidates = generateVerifiedCandidates(prefs, catalog);
  if (candidates.length === 0) {
    const fallback = generateSampleBuilds(prefs, catalog);
    return {
      builds: fallback,
      totalVerifiedPoolCount: fallback.length,
      usedBudgetFallback: true,
    };
  }

  const userBudget = Math.max(15000, prefs.budget);
  const withinBudget = candidates.filter((c) => c.price <= userBudget);
  const usedBudgetFallback = withinBudget.length === 0;

  const basePool = usedBudgetFallback
    ? [...candidates].sort((a, b) => a.price - b.price).slice(0, 18)
    : withinBudget;

  const balancedPool =
    prefs.purpose === 'ofis'
      ? basePool
      : basePool.filter((c) => Math.abs(c.gpu.tierLevel - c.cpu.tierLevel) <= 1);

  const activePool = balancedPool.length >= 3 ? balancedPool : basePool;

  // Her GPU+CPU ikilisi için en yüksek skorlu (ve eşitlikte en uygun fiyatlı) adayı seç
  const sorted = [...activePool].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.price - b.price;
  });

  const bestByCombo = new Map<string, CandidateBuild>();
  for (const cand of sorted) {
    const comboKey = `${cand.ids.cpuId}::${cand.ids.gpuId}`;
    if (!bestByCombo.has(comboKey)) {
      bestByCombo.set(comboKey, cand);
    }
  }

  const distinct = Array.from(bestByCombo.values()).slice(0, limit);
  const prices = distinct.map((d) => d.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const span = Math.max(1, maxP - minP);

  const builds = distinct.map((cand) => {
    const ratio = (cand.price - minP) / span;
    const tier: BuildTier =
      ratio >= 0.67
        ? 'yuksek-performans'
        : ratio <= 0.33
          ? 'butce-dostu'
          : 'fiyat-performans';
    return assembleBuildFromIds(tier, cand.ids, prefs, catalog);
  });

  return {
    builds,
    totalVerifiedPoolCount: activePool.length,
    usedBudgetFallback,
  };
}

export interface ShowcaseReadySystemPreset {
  id: string;
  systemName: string;
  tier: BuildTier;
  tierTitle: string;
  tierSubtitle: string;
  tagline: string;
  badgeText: string;
  image: string;
  resolution: TargetResolution;
  purpose: UsagePurpose;
  fallbackPriceTry: number;
  fallbackOldPriceTry: number;
  discountPercent: number;
  ids: SelectedPartIds;
  performanceNote: string;
}

export const SHOWCASE_READY_SYSTEM_PRESETS: ShowcaseReadySystemPreset[] = [
  {
    id: 'rmg-fp-rtx4060-ryzen5',
    systemName: 'RMG F/P Sistemi - RTX 4060 & Ryzen 5',
    tier: 'fiyat-performans',
    tierTitle: 'En Çok Satan F/P',
    tierSubtitle: '1080p Yüksek Ayar · DLSS 3 Destekli',
    tagline: 'Ryzen 5 5600 · RTX 4060 8 GB · 16 GB DDR4 · 1 TB NVMe SSD',
    badgeText: 'Çok Satıyor',
    image: '/src/assets/images/hero_slider_systems_1794781723754.jpg',
    resolution: '1080p',
    purpose: 'oyun',
    fallbackPriceTry: 28999,
    fallbackOldPriceTry: 32999,
    discountPercent: 12,
    ids: {
      cpuId: 'cpu-r5-5600',
      gpuId: 'gpu-rtx4060',
      motherboardId: 'mb-b550m',
      ramId: 'ram-16-d4',
      ssdId: 'ssd-1tb-gen4',
      psuId: 'psu-650-bronze',
      caseId: 'case-matx-compact',
      coolerId: 'cooler-ak400',
    },
    performanceNote:
      'Cyberpunk 2077, Valorant ve GTA V başta olmak üzere 1080p yüksek ayarlarda DLSS 3 ile akıcı FPS sunan fiyat/performans şampiyonu hazır sistem.',
  },
  {
    id: 'rmg-espor-canavari-4060ti',
    systemName: 'Espor Canavarı - Ryzen 5 7500F & RTX 4060 Ti',
    tier: 'yuksek-performans',
    tierTitle: 'Espor & Rekabetçi',
    tierSubtitle: 'AM5 DDR5 · 360+ FPS Espor Odaklı',
    tagline: 'Ryzen 5 7500F · RTX 4060 Ti 8 GB · 32 GB DDR5 · 1 TB NVMe',
    badgeText: 'Espor Özel',
    image: '/src/assets/images/build_price_performance_1794757634823.jpg',
    resolution: '1080p',
    purpose: 'oyun',
    fallbackPriceTry: 41499,
    fallbackOldPriceTry: 46499,
    discountPercent: 11,
    ids: {
      cpuId: 'cpu-r5-7500f',
      gpuId: 'gpu-rtx4060ti',
      motherboardId: 'mb-b650m-k',
      ramId: 'ram-32-d5',
      ssdId: 'ssd-1tb-gen4',
      psuId: 'psu-650-bronze',
      caseId: 'case-atx-flow',
      coolerId: 'cooler-ak400',
    },
    performanceNote:
      'Valorant, Counter-Strike 2 ve Apex Legends gibi rekabetçi oyunlarda 240Hz/360Hz monitörleri tam besleyen AM5 DDR5 espor sistemi.',
  },
  {
    id: 'rmg-pulse-2k-rx7800xt',
    systemName: 'RMG Pulse 2K - RX 7800 XT 16 GB',
    tier: 'fiyat-performans',
    tierTitle: '2K QHD Ultra',
    tierSubtitle: '16 GB VRAM · Yüksek Hava Akışlı ATX',
    tagline: 'Ryzen 5 7500F · RX 7800 XT 16 GB · 32 GB DDR5 · 750W Gold',
    badgeText: 'Çok Satıyor',
    image: '/src/assets/images/hero_custom_pc_rig_1794757633660.jpg',
    resolution: '1440p',
    purpose: 'oyun',
    fallbackPriceTry: 52999,
    fallbackOldPriceTry: 58900,
    discountPercent: 10,
    ids: {
      cpuId: 'cpu-r5-7500f',
      gpuId: 'gpu-rx7800xt',
      motherboardId: 'mb-b650-atx',
      ramId: 'ram-32-d5',
      ssdId: 'ssd-1tb-pro',
      psuId: 'psu-750-gold',
      caseId: 'case-atx-flow',
      coolerId: 'cooler-pa120',
    },
    performanceNote:
      '1440p 2K QHD çözünürlükte 16 GB VRAM avantajı ve Samsung 990 PRO NVMe hızıyla AAA oyunlar için tasarlanmış uzun ömürlü hazır sistem.',
  },
  {
    id: 'rmg-creator-pro-4070s',
    systemName: 'RMG Creator Pro - i5-14400F & RTX 4070 Super',
    tier: 'fiyat-performans',
    tierTitle: 'Yayın & Tasarım',
    tierSubtitle: '240 mm Sıvı Soğutma · 2 TB NVMe',
    tagline: 'Core i5-14400F · RTX 4070 Super 12 GB · 32 GB DDR5 · 2 TB PRO',
    badgeText: 'Editör Seçimi',
    image: '/src/assets/images/pc_interior_gpu_angle_1794762765498.jpg',
    resolution: '1440p',
    purpose: 'yayin',
    fallbackPriceTry: 63499,
    fallbackOldPriceTry: 69999,
    discountPercent: 9,
    ids: {
      cpuId: 'cpu-i5-14400f',
      gpuId: 'gpu-rtx4070-super',
      motherboardId: 'mb-b760-d5',
      ramId: 'ram-32-d5',
      ssdId: 'ssd-2tb-pro',
      psuId: 'psu-750-gold',
      caseId: 'case-atx-flow',
      coolerId: 'cooler-aio-240',
    },
    performanceNote:
      'Çift NVENC yayın kodlayıcı, 10 çekirdekli hibrit işlemci ve 2 TB DRAM önbellekli SSD ile aynı anda 2K oyun, yayın ve kurgu iş akışları için hazır.',
  },
  {
    id: 'rmg-apex-4k-7800x3d-4080s',
    systemName: 'RMG Apex 4K - Ryzen 7 7800X3D & RTX 4080 Super',
    tier: 'yuksek-performans',
    tierTitle: '4K Amiral Gemisi',
    tierSubtitle: '360 mm Sıvı Soğutma · 64 GB DDR5',
    tagline: 'Ryzen 7 7800X3D · RTX 4080 Super 16 GB · 64 GB DDR5 · 850W Gold',
    badgeText: 'Amiral Gemisi',
    image: '/src/assets/images/hero_slider_builder_1794781723325.jpg',
    resolution: '4k',
    purpose: 'oyun',
    fallbackPriceTry: 96999,
    fallbackOldPriceTry: 107500,
    discountPercent: 10,
    ids: {
      cpuId: 'cpu-r7-7800x3d',
      gpuId: 'gpu-rtx4080-super',
      motherboardId: 'mb-x870e-atx',
      ramId: 'ram-64-d5',
      ssdId: 'ssd-2tb-pro',
      psuId: 'psu-850-gold',
      caseId: 'case-atx-xl',
      coolerId: 'cooler-aio-360',
    },
    performanceNote:
      '96 MB 3D V-Cache önbellekli oyun işlemcisi, 360 mm AIO sıvı soğutma ve RTX 4080 Super ile 4K Ultra ışın izlemeli oyun deneyimi için amiral gemisi kasa.',
  },
];

export interface ShowcaseReadySystemItem {
  preset: ShowcaseReadySystemPreset;
  build: PcBuild;
  oldPriceTry: number;
  discountPercent: number;
}

export function getShowcaseReadyBuilds(
  catalog: PricingCatalogResponse | null
): ShowcaseReadySystemItem[] {
  return SHOWCASE_READY_SYSTEM_PRESETS.map((preset) => {
    const prefs: BuilderPreferences = {
      budget: preset.fallbackPriceTry + 10000,
      purpose: preset.purpose,
      favoriteGames: ['Valorant', 'Cyberpunk 2077', 'Red Dead Redemption 2'],
      resolution: preset.resolution,
      cpuBrandPref: 'farketmez',
      gpuBrandPref: 'farketmez',
    };

    const assembled = assembleBuildFromIds(preset.tier, preset.ids, prefs, catalog);
    const liveTotal = assembled.samplePriceTry;
    const effectivePrice = liveTotal > 0 ? liveTotal : preset.fallbackPriceTry;
    const oldPriceTry =
      liveTotal > 0
        ? Math.round(liveTotal / (1 - preset.discountPercent / 100))
        : preset.fallbackOldPriceTry;

    const build: PcBuild = {
      ...assembled,
      id: preset.id,
      systemName: preset.systemName,
      tierTitle: preset.tierTitle,
      tierSubtitle: preset.tierSubtitle,
      image: preset.image,
      samplePriceTry: effectivePrice,
      allNewTotalTry: oldPriceTry,
      bundleSavingsTry: Math.max(0, oldPriceTry - effectivePrice),
      bundleSavingsPercent: preset.discountPercent,
      performanceNote: preset.performanceNote,
    };

    return {
      preset,
      build,
      oldPriceTry,
      discountPercent: preset.discountPercent,
    };
  });
}
