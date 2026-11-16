import {
  BuilderPreferences,
  BuildTier,
  ComponentCondition,
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

export const BUILD_IMAGES: Record<BuildTier | 'hero', string> = {
  hero: '/src/assets/images/hero_custom_pc_rig_1794757633660.jpg',
  'fiyat-performans': '/src/assets/images/build_price_performance_1794757634823.jpg',
  'yuksek-performans': '/src/assets/images/build_max_performance_1794757634829.jpg',
  'butce-dostu': '/src/assets/images/build_budget_friendly_1794757634366.jpg',
};

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
  'Cyberpunk 2077',
  'Red Dead Redemption 2',
  "Baldur's Gate 3",
  'GTA V',
  'League of Legends',
  'Forza Horizon 5',
  'Alan Wake 2',
  'Apex Legends',
];

export const ESPORTS_GAMES = new Set([
  'Valorant',
  'Counter-Strike 2',
  'League of Legends',
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

export const CONDITION_OPTIONS: {
  id: ComponentCondition;
  title: string;
  subtitle: string;
}[] = [
  {
    id: 'sifir',
    title: 'Sıfır Parçalar',
    subtitle: 'Tamamı yeni nesil bileşen fiyatlandırması',
  },
  {
    id: 'karma',
    title: 'Karma (Sıfır + İkinci El)',
    subtitle: 'CPU ve GPU ikinci el fiyat avantajı, SSD ve PSU sıfır',
  },
  {
    id: 'ikinci-el',
    title: 'İkinci El Odaklı',
    subtitle: 'Maksimum bütçe tasarrufu için ikinci el ağırlıklı kurgu',
  },
];

export const CPU_BRAND_OPTIONS: { id: CpuBrandPreference; title: string; subtitle: string }[] = [
  { id: 'farketmez', title: 'Farketmez', subtitle: 'Bütçe ve performansa göre en iyi eşleşme' },
  { id: 'amd', title: 'AMD Ryzen', subtitle: 'AM4 / AM5 platform ve 3D V-Cache odağı' },
  { id: 'intel', title: 'Intel Core', subtitle: 'LGA1700 çok çekirdekli hibrit mimari' },
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
  catalog: PricingCatalogResponse | null,
  condition: ComponentCondition,
  category: PartCategoryKey
): {
  price: number;
  newPrice: number;
  conditionLabel: 'Sıfır' | 'İkinci El';
  sourceType: PriceSourceType;
  sourceSummary: string;
  listingCount: number;
  excludedOutlierCount: number;
  lastCheckedAt: string | null;
  info: PartPricingInfo | undefined;
} {
  const info = catalog?.partsPricing[partId];
  const useUsed =
    condition === 'ikinci-el'
      ? true
      : condition === 'karma'
        ? category === 'cpu' || category === 'gpu'
        : false;

  if (!info) {
    return {
      price: 0,
      newPrice: 0,
      conditionLabel: useUsed ? 'İkinci El' : 'Sıfır',
      sourceType: 'unavailable',
      sourceSummary: 'Fiyat veri kaynağı yüklenmedi',
      listingCount: 0,
      excludedOutlierCount: 0,
      lastCheckedAt: null,
      info: undefined,
    };
  }

  const newPrice = info.newPriceTry ?? 0;
  if (useUsed && info.usedPriceTry !== null) {
    const stats = info.usedStats;
    return {
      price: info.usedPriceTry,
      newPrice,
      conditionLabel: 'İkinci El',
      sourceType: info.usedSourceType,
      sourceSummary: info.usedSourceLabel,
      listingCount: stats?.listingCount ?? 0,
      excludedOutlierCount: stats?.excludedOutlierCount ?? 0,
      lastCheckedAt: stats?.lastCheckedAt ?? info.lastCheckedAt,
      info,
    };
  }

  const stats = info.newStats;
  return {
    price: newPrice,
    newPrice,
    conditionLabel: 'Sıfır',
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
  const cpu = CPU_DB.find((p) => p.id === ids.cpuId) ?? CPU_DB[0];
  const gpu = GPU_DB.find((p) => p.id === ids.gpuId) ?? GPU_DB[1];
  const motherboard =
    MOTHERBOARD_DB.find((p) => p.id === ids.motherboardId) ?? MOTHERBOARD_DB[0];
  const ram = RAM_DB.find((p) => p.id === ids.ramId) ?? RAM_DB[0];
  const ssd = SSD_DB.find((p) => p.id === ids.ssdId) ?? SSD_DB[0];
  const psu = PSU_DB.find((p) => p.id === ids.psuId) ?? PSU_DB[0];
  const pcCase = CASE_DB.find((p) => p.id === ids.caseId) ?? CASE_DB[0];
  const cooler =
    CPU_COOLER_DB.find((p) => p.id === ids.coolerId) ?? CPU_COOLER_DB[0];

  const cpuP = getPricingForPart(cpu.id, catalog, prefs.condition, 'cpu');
  const gpuP = getPricingForPart(gpu.id, catalog, prefs.condition, 'gpu');
  const mbP = getPricingForPart(motherboard.id, catalog, prefs.condition, 'motherboard');
  const ramP = getPricingForPart(ram.id, catalog, prefs.condition, 'ram');
  const ssdP = getPricingForPart(ssd.id, catalog, prefs.condition, 'ssd');
  const psuP = getPricingForPart(psu.id, catalog, prefs.condition, 'psu');
  const caseP = getPricingForPart(pcCase.id, catalog, prefs.condition, 'pcCase');
  const coolerP = getPricingForPart(cooler.id, catalog, prefs.condition, 'cooler');

  const allPricings = [cpuP, gpuP, mbP, ramP, ssdP, psuP, caseP, coolerP];
  const calculatedTotalTry = allPricings.reduce((acc, item) => acc + item.price, 0);
  const allNewTotalTry = allPricings.reduce((acc, item) => acc + item.newPrice, 0);
  const zeroVsUsedSavingsTry = Math.max(0, allNewTotalTry - calculatedTotalTry);
  const zeroVsUsedSavingsPercent =
    allNewTotalTry > 0 ? Math.round((zeroVsUsedSavingsTry / allNewTotalTry) * 100) : 0;

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

  const conditionText =
    prefs.condition === 'sifir'
      ? 'Tamamı Sıfır Kurgu'
      : prefs.condition === 'karma'
        ? 'Karma (CPU/GPU İkinci El, Diğerleri Sıfır)'
        : 'İkinci El Ağırlıklı Kurgu';

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
    conditionLabel: p.conditionLabel,
    priceTry: p.price,
    priceSourceType: p.sourceType,
    priceSourceSummary: p.sourceSummary,
    listingCount: p.listingCount,
    excludedOutlierCount: p.excludedOutlierCount,
    lastCheckedAt: p.lastCheckedAt,
    comparison: p.info?.comparison ?? {
      newPriceTry: p.newPrice,
      usedPriceTry: null,
      differenceTry: null,
      savingsPercent: null,
      newSourceLabel: p.sourceSummary,
      usedSourceLabel: 'Veri yok',
      advantageNote: '',
      riskNote: '',
    },
    selectionReason: reason,
  });

  return {
    id: `rmg-${tier}-${cpu.id}-${gpu.id}-${cooler.id}-${prefs.resolution}-${prefs.condition}`,
    tier,
    tierTitle: tierMeta[tier].title,
    tierSubtitle: tierMeta[tier].subtitle,
    systemName,
    image: BUILD_IMAGES[tier],
    samplePriceTry: calculatedTotalTry,
    hasRealListingData,
    allNewTotalTry,
    zeroVsUsedSavingsTry,
    zeroVsUsedSavingsPercent,
    budgetStatusText,
    isWithinBudget,
    estimatedWattage: compatibility.realisticPeakDrawWatts,
    recommendedPsuWatts: compatibility.recommendedPsuWatts,
    targetResolution: prefs.resolution,
    suitedPurposes: [prefs.purpose],
    conditionSummary: conditionText,
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
  const cpus = CPU_DB.filter((p) => !p.isUnverifiedSpecSample).filter((c) => {
    if (prefs.cpuBrandPref === 'amd') return c.brand === 'AMD';
    if (prefs.cpuBrandPref === 'intel') return c.brand === 'Intel';
    return true;
  });

  const gpus = GPU_DB.filter((p) => !p.isUnverifiedSpecSample)
    .filter((g) => (prefs.purpose === 'ofis' ? true : !g.isIntegrated))
    .filter((g) => {
      if (g.isIntegrated) return true;
      if (prefs.gpuBrandPref === 'nvidia') return g.brand === 'NVIDIA';
      if (prefs.gpuBrandPref === 'amd') return g.brand === 'AMD';
      return true;
    });

  const motherboards = MOTHERBOARD_DB.filter((p) => !p.isUnverifiedSpecSample);
  const rams = RAM_DB.filter((p) => !p.isUnverifiedSpecSample);
  const ssds = SSD_DB.filter((p) => !p.isUnverifiedSpecSample);
  const psus = PSU_DB.filter((p) => !p.isUnverifiedSpecSample);
  const cases = CASE_DB.filter((p) => !p.isUnverifiedSpecSample);
  const coolers = CPU_COOLER_DB.filter((p) => !p.isUnverifiedSpecSample);

  const { prefersEsports, prefersHeavyAaa } = analyzeGameProfile(prefs.favoriteGames);
  const candidates: CandidateBuild[] = [];

  for (const cpu of cpus) {
    const validBoards = motherboards
      .filter(
        (mb) =>
          mb.socket === cpu.socket &&
          cpu.generation !== null &&
          mb.nativeCpuGenerations.includes(cpu.generation) &&
          cpu.maxPowerWatts !== null &&
          mb.vrmMaxCpuWatts !== null &&
          cpu.maxPowerWatts <= mb.vrmMaxCpuWatts
      )
      .sort(
        (a, b) =>
          getPricingForPart(a.id, catalog, prefs.condition, 'motherboard').price -
          getPricingForPart(b.id, catalog, prefs.condition, 'motherboard').price
      );

    if (validBoards.length === 0) continue;

    const boardOptions =
      validBoards.length > 1
        ? [validBoards[0], validBoards[validBoards.length - 1]]
        : [validBoards[0]];

    for (const mb of boardOptions) {
      const validRams = rams
        .filter(
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
        )
        .sort(
          (a, b) =>
            getPricingForPart(a.id, catalog, prefs.condition, 'ram').price -
            getPricingForPart(b.id, catalog, prefs.condition, 'ram').price
        );

      if (validRams.length === 0) continue;

      const preferredRam =
        prefs.purpose === 'tasarim' || prefs.purpose === 'yayin'
          ? validRams.find((r) => (r.capacityGb ?? 0) >= 32) ?? validRams[validRams.length - 1]
          : validRams[0];
      const highRam = validRams[validRams.length - 1];
      const ramOptions =
        preferredRam.id === highRam.id ? [preferredRam] : [preferredRam, highRam];

      const validCoolers = coolers
        .filter(
          (cl) =>
            cl.supportedSockets.includes(cpu.socket) &&
            cpu.maxPowerWatts !== null &&
            cl.maxTdpCapacityWatts !== null &&
            cl.maxTdpCapacityWatts >= cpu.maxPowerWatts &&
            (!cpu.requiresDedicatedCooler || cl.coolerType !== 'Stok / Giriş')
        )
        .sort(
          (a, b) =>
            getPricingForPart(a.id, catalog, prefs.condition, 'cooler').price -
            getPricingForPart(b.id, catalog, prefs.condition, 'cooler').price
        );

      if (validCoolers.length === 0) continue;
      const cooler = validCoolers[0];

      for (const ram of ramOptions) {
        const sortedSsds = [...ssds].sort(
          (a, b) =>
            getPricingForPart(a.id, catalog, prefs.condition, 'ssd').price -
            getPricingForPart(b.id, catalog, prefs.condition, 'ssd').price
        );
        const ssd =
          (prefersHeavyAaa || prefs.purpose === 'tasarim') &&
          sortedSsds.some((s) => s.capacityGb >= 1000)
            ? sortedSsds.find((s) => s.capacityGb >= 1000) ?? sortedSsds[0]
            : sortedSsds[0];

        for (const gpu of gpus) {
          if (
            gpu.isIntegrated &&
            (!cpu.hasIntegratedGraphics || gpu.brand !== cpu.brand)
          ) {
            continue;
          }
          const validCase = cases
            .filter((c) => {
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
            })
            .sort(
              (a, b) =>
                getPricingForPart(a.id, catalog, prefs.condition, 'pcCase').price -
                getPricingForPart(b.id, catalog, prefs.condition, 'pcCase').price
            )[0];

          if (!validCase) continue;

          const validPsu = psus
            .filter((p) => {
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
            })
            .sort(
              (a, b) =>
                getPricingForPart(a.id, catalog, prefs.condition, 'psu').price -
                getPricingForPart(b.id, catalog, prefs.condition, 'psu').price
            )[0];

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

          const cpuPrice = getPricingForPart(cpu.id, catalog, prefs.condition, 'cpu').price;
          const gpuPrice = getPricingForPart(gpu.id, catalog, prefs.condition, 'gpu').price;

          const price =
            cpuPrice +
            gpuPrice +
            getPricingForPart(mb.id, catalog, prefs.condition, 'motherboard').price +
            getPricingForPart(ram.id, catalog, prefs.condition, 'ram').price +
            getPricingForPart(ssd.id, catalog, prefs.condition, 'ssd').price +
            getPricingForPart(validPsu.id, catalog, prefs.condition, 'psu').price +
            getPricingForPart(validCase.id, catalog, prefs.condition, 'pcCase').price +
            getPricingForPart(cooler.id, catalog, prefs.condition, 'cooler').price;

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
