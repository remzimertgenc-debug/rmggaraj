export type PageId =
  | 'home'
  | 'systems'
  | 'builder'
  | 'gpus'
  | 'cpus'
  | 'catalog'
  | 'detail'
  | 'part-detail'
  | 'terms'
  | 'privacy'
  | 'cookies'
  | 'kvkk';

export type UsagePurpose = 'oyun' | 'yayin' | 'tasarim' | 'ofis';

export type TargetResolution = '1080p' | '1440p' | '4k';

export type ComponentCondition = 'sifir' | 'ikinci-el' | 'karma';

export type CpuBrandPreference = 'farketmez' | 'amd' | 'intel';
export type GpuBrandPreference = 'farketmez' | 'nvidia' | 'amd';

export type BuildTier = 'fiyat-performans' | 'yuksek-performans' | 'butce-dostu';

export type CpuSocket = 'AM4' | 'AM5' | 'LGA1700' | 'LGA1851' | 'LGA1200' | 'LGA1151' | 'LGA2066' | 'AM3+';
export type CpuGeneration = string;

export type RamGeneration = 'DDR4' | 'DDR5';
export type FormFactor = 'ATX' | 'Micro-ATX' | 'Mini-ITX';

export interface BuilderPreferences {
  budget: number;
  purpose: UsagePurpose;
  favoriteGames: string[];
  resolution: TargetResolution;
  condition: ComponentCondition;
  cpuBrandPref: CpuBrandPreference;
  gpuBrandPref: GpuBrandPreference;
}

export interface BasePartSpec {
  id: string;
  model: string;
  brand: string;
  tierLevel: 1 | 2 | 3 | 4 | 5;
  specSummary: string;
  isUnverifiedSpecSample?: boolean;
}

export interface CpuPart extends BasePartSpec {
  socket: CpuSocket;
  generation: CpuGeneration | null;
  cores: number;
  threads: number;
  boostClockGhz: number;
  tdpWatts: number | null; // Temel TDP
  maxPowerWatts: number | null; // Gerçekçi maksimum turbo güç tüketimi (PPT / PL2)
  requiresDedicatedCooler: boolean; // Kutudan soğutucu çıkmayan veya yüksek TDP'li işlemciler
  hasIntegratedGraphics: boolean;
  supportedRam: RamGeneration[];
  gamingScore: number;
  productivityScore: number;
}

export interface GpuPowerConnectors {
  eightPinCount: number;
  twelveVhpwrCount: number;
}

export interface GpuPart extends BasePartSpec {
  shortTitle: string;
  vramGb: number | null;
  tdpWatts: number | null;
  peakPowerWatts: number | null; // Gerçekçi tepe yük tüketimi
  lengthMm: number | null;
  widthSlots: number | null;
  recommendedPsuWatts: number | null;
  requiredConnectors: GpuPowerConnectors | null;
  supportsNvenc: boolean;
  isIntegrated?: boolean;
  score1080p: number;
  score1440p: number;
  score4k: number;
}

export interface MotherboardPart extends BasePartSpec {
  socket: CpuSocket;
  nativeCpuGenerations: CpuGeneration[];
  biosUpdateCpuGenerations: CpuGeneration[];
  hasBiosFlashback: boolean;
  supportedRam: RamGeneration | null;
  ramSlots: number | null;
  maxRamGb: number | null;
  maxRamSpeedMhz: number | null;
  vrmMaxCpuWatts: number | null; // VRM'in güvenle besleyebileceği maks CPU gücü (W)
  formFactor: FormFactor;
  m2Slots: number;
  cpuEpsConnectors: number;
}

export interface RamPart extends BasePartSpec {
  generation: RamGeneration | null;
  capacityGb: number | null;
  modulesCount: number | null;
  speedMhz: number | null;
  latency: string;
  channelConfig: 'Çift Kanal' | 'Tek Modül' | 'Dört Modül';
}

export interface SsdPart extends BasePartSpec {
  capacityGb: number;
  interfaceType: 'PCIe 3.0' | 'PCIe 4.0' | 'PCIe 5.0';
  readSpeedMb: number;
  hasDramCache: boolean;
}

export interface PsuConnectors {
  pcie8PinCount: number;
  twelveVhpwrCount: number;
  eps8PinCount: number;
}

export interface PsuPart extends BasePartSpec {
  wattage: number | null;
  efficiency: string;
  modular: 'Tam Modüler' | 'Yarı Modüler' | 'Sabit Kablo';
  atxStandard: 'ATX 2.4' | 'ATX 3.0' | 'ATX 3.1';
  connectors: PsuConnectors | null;
}

export interface CasePart extends BasePartSpec {
  supportedFormFactors: FormFactor[];
  maxGpuLengthMm: number | null;
  expansionSlots: number | null;
  maxCoolerHeightMm: number | null; // Hava soğutucu maksimum yükseklik (mm)
  supportedRadiatorMm: number[]; // Örn. [120, 240, 360]
  airflowType: string;
}

export interface CoolerPart extends BasePartSpec {
  coolerType: 'Hava Soğutma' | 'Sıvı Soğutma' | 'Stok / Giriş';
  supportedSockets: CpuSocket[];
  maxTdpCapacityWatts: number | null;
  heightMm: number | null; // Hava soğutucu yüksekliği
  radiatorMm: number | null; // Sıvı soğutucu radyatör ölçüsü (240 / 360)
}

export type PartCategoryKey =
  | 'cpu'
  | 'gpu'
  | 'motherboard'
  | 'ram'
  | 'ssd'
  | 'psu'
  | 'pcCase'
  | 'cooler';

export type MarketplacePlatform =
  | 'Sahibinden'
  | 'Letgo'
  | 'Facebook Marketplace'
  | 'Yetkili Sağlayıcı'
  | 'Vatan'
  | 'İtopya'
  | 'Sinerji'
  | 'Trendyol';

export type ProductConditionGrade =
  | 'Sıfır / Kapalı Kutu'
  | 'Çok İyi (Faturalı)'
  | 'İyi'
  | 'Orta';

export interface MarketplaceListing {
  id: string;
  partId: string;
  productName: string;
  brandModel: string;
  listingPriceTry: number;
  platform: MarketplacePlatform;
  listingUrl: string;
  listingDate: string; // YYYY-MM-DD
  conditionGrade: ProductConditionGrade;
  isNew: boolean;
  lastCheckedAt: string; // ISO string
  isSuspiciousOutlier?: boolean;
  outlierReason?: string;
  isOwner?: boolean;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
}

export interface MarketPriceStats {
  minPriceTry: number;
  medianPriceTry: number;
  averagePriceTry: number;
  listingCount: number;
  excludedOutlierCount: number;
  sources: MarketplacePlatform[];
  lastCheckedAt: string;
}

export interface ZeroVsUsedComparison {
  newPriceTry: number | null;
  usedPriceTry: number | null;
  differenceTry: number | null;
  savingsPercent: number | null;
  newSourceLabel: string;
  usedSourceLabel: string;
  advantageNote: string;
  riskNote: string;
}

export type PriceSourceType =
  | 'authorized_api'
  | 'user_listings'
  | 'estimated_reference'
  | 'unavailable';

export interface PartPricingInfo {
  partId: string;
  newPriceTry: number | null;
  usedPriceTry: number | null;
  newStats: MarketPriceStats | null;
  usedStats: MarketPriceStats | null;
  newSourceType: PriceSourceType;
  usedSourceType: PriceSourceType;
  newSourceLabel: string;
  usedSourceLabel: string;
  lastCheckedAt: string | null;
  comparison: ZeroVsUsedComparison;
}

export interface DynamicCatalogProduct {
  id: string;
  category: PartCategoryKey;
  brand: string;
  name: string;
  specSummary: string;
  imageUrl: string | null;
  socket?: string | null;
  ramType?: string | null;
  formFactor?: string | null;
  tdp?: number | null;
  wattage?: number | null;
  maxGpuLengthMm?: number | null;
  isCatalogCore?: boolean;
  sourceStore: string | null;
  externalUrl: string | null;
}

export interface PricingCatalogResponse {
  providerStatus: {
    authorizedApiConfigured: boolean;
    providerMessage: string;
    lastSyncedAt: string;
  };
  partsPricing: Record<string, PartPricingInfo>;
  listings: MarketplaceListing[];
  dynamicProducts: DynamicCatalogProduct[];
  catalogProducts?: DynamicCatalogProduct[];
  productImages: Record<string, string>;
}

export interface ComponentSpec {
  partId: string;
  category: PartCategoryKey;
  label: string;
  model: string;
  detail: string;
  conditionLabel: 'Sıfır' | 'İkinci El';
  priceTry: number;
  priceSourceType: PriceSourceType;
  priceSourceSummary: string;
  listingCount: number;
  excludedOutlierCount: number;
  lastCheckedAt: string | null;
  comparison: ZeroVsUsedComparison;
  selectionReason: string;
}

export type CheckStatus = 'verified' | 'needs_verification' | 'incompatible';

export interface CompatibilityCheckItem {
  id:
    | 'socket'
    | 'ram_gen'
    | 'bios'
    | 'ram_spec'
    | 'gpu_case'
    | 'cooler_case'
    | 'psu_watt'
    | 'psu_connectors'
    | 'cooler_req'
    | 'vrm';
  title: string;
  status: CheckStatus;
  message: string;
}

export interface CompatibilityReport {
  overallStatus: CheckStatus;
  verifiedCount: number;
  needsVerificationCount: number;
  incompatibleCount: number;
  totalChecks: number;
  realisticPeakDrawWatts: number | null;
  recommendedPsuWatts: number | null;
  checks: CompatibilityCheckItem[];
  warnings: string[];
}

export interface SelectedPartIds {
  cpuId: string;
  gpuId: string;
  motherboardId: string;
  ramId: string;
  ssdId: string;
  psuId: string;
  caseId: string;
  coolerId: string;
}

export interface PcBuild {
  id: string;
  tier: BuildTier;
  tierTitle: string;
  tierSubtitle: string;
  systemName: string;
  image: string;
  samplePriceTry: number;
  hasRealListingData: boolean;
  allNewTotalTry: number;
  zeroVsUsedSavingsTry: number;
  zeroVsUsedSavingsPercent: number;
  budgetStatusText: string;
  isWithinBudget: boolean;
  estimatedWattage: number | null;
  recommendedPsuWatts: number | null;
  targetResolution: TargetResolution;
  suitedPurposes: UsagePurpose[];
  conditionSummary: string;
  selectedIds: SelectedPartIds;
  cpu: ComponentSpec;
  gpu: ComponentSpec;
  motherboard: ComponentSpec;
  ram: ComponentSpec;
  ssd: ComponentSpec;
  psu: ComponentSpec;
  pcCase: ComponentSpec;
  cooler: ComponentSpec;
  compatibility: CompatibilityReport;
  performanceNote: string;
  isCustomized?: boolean;
}
