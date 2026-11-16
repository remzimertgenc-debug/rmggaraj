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
import {
  BasePartSpec,
  CasePart,
  CoolerPart,
  CpuPart,
  GpuPart,
  MotherboardPart,
  PartCategoryKey,
  PsuPart,
  RamPart,
  SsdPart,
} from '../types/pc';

export const CATEGORY_LABELS: Record<PartCategoryKey, string> = {
  cpu: 'İşlemci',
  gpu: 'Ekran Kartı',
  motherboard: 'Anakart',
  ram: 'RAM Bellek',
  ssd: 'SSD Depolama',
  psu: 'Güç Kaynağı (PSU)',
  pcCase: 'Bilgisayar Kasası',
  cooler: 'İşlemci Soğutucu',
};

export const STUDIO_MEDIA_PATHS = {
  cpuAmd: '/src/assets/images/cpu_amd_ryzen_studio_1794767728384.jpg',
  cpuIntel: '/src/assets/images/cpu_intel_core_studio_1794767728511.jpg',
  cpuFallback: '/src/assets/images/cpu_product_studio_1794762765866.jpg',
  gpuNvidia: '/src/assets/images/gpu_product_studio_1794762766377.jpg',
  gpuAmd: '/src/assets/images/gpu_amd_radeon_studio_1794767729143.jpg',
  gpuIntel: '/src/assets/images/gpu_intel_arc_studio_1794767729600.jpg',
  motherboard: '/src/assets/images/motherboard_studio_1794767730359.jpg',
  ram: '/src/assets/images/ram_ddr5_studio_1794767730266.jpg',
  ssd: '/src/assets/images/ssd_nvme_studio_1794767730740.jpg',
  psu: '/src/assets/images/psu_modular_studio_1794767730903.jpg',
  coolerAir: '/src/assets/images/cooler_air_tower_studio_1794767731151.jpg',
  coolerAio: '/src/assets/images/cooler_aio_liquid_studio_1794767731957.jpg',
  caseAtX: '/src/assets/images/case_airflow_studio_1794767730664.jpg',
  caseCompact: '/src/assets/images/build_budget_friendly_1794757634366.jpg',
  caseXl: '/src/assets/images/build_max_performance_1794757634829.jpg',
} as const;

export type AnyCatalogPart =
  | { category: 'cpu'; part: CpuPart }
  | { category: 'gpu'; part: GpuPart }
  | { category: 'motherboard'; part: MotherboardPart }
  | { category: 'ram'; part: RamPart }
  | { category: 'ssd'; part: SsdPart }
  | { category: 'psu'; part: PsuPart }
  | { category: 'pcCase'; part: CasePart }
  | { category: 'cooler'; part: CoolerPart };

export function getPartImage(
  category: PartCategoryKey,
  part?: Partial<BasePartSpec> & {
    isIntegrated?: boolean;
    coolerType?: CoolerPart['coolerType'];
    supportedFormFactors?: CasePart['supportedFormFactors'];
  }
): string {
  const brand = (part?.brand ?? '').toLowerCase();
  const model = (part?.model ?? '').toLowerCase();

  switch (category) {
    case 'cpu':
      if (brand.includes('intel') || model.includes('intel')) {
        return STUDIO_MEDIA_PATHS.cpuIntel;
      }
      if (brand.includes('amd') || model.includes('ryzen')) {
        return STUDIO_MEDIA_PATHS.cpuAmd;
      }
      return STUDIO_MEDIA_PATHS.cpuFallback;

    case 'gpu':
      if (part?.isIntegrated) {
        return STUDIO_MEDIA_PATHS.cpuAmd;
      }
      if (brand.includes('amd') || model.includes('radeon')) {
        return STUDIO_MEDIA_PATHS.gpuAmd;
      }
      if (brand.includes('intel') || model.includes('arc')) {
        return STUDIO_MEDIA_PATHS.gpuIntel;
      }
      return STUDIO_MEDIA_PATHS.gpuNvidia;

    case 'motherboard':
      return STUDIO_MEDIA_PATHS.motherboard;

    case 'ram':
      return STUDIO_MEDIA_PATHS.ram;

    case 'ssd':
      return STUDIO_MEDIA_PATHS.ssd;

    case 'psu':
      return STUDIO_MEDIA_PATHS.psu;

    case 'cooler':
      if (
        part?.coolerType === 'Sıvı Soğutma' ||
        model.includes('aio') ||
        model.includes('liquid') ||
        model.includes('sıvı')
      ) {
        return STUDIO_MEDIA_PATHS.coolerAio;
      }
      return STUDIO_MEDIA_PATHS.coolerAir;

    case 'pcCase':
      if (part?.id === 'case-atx-xl' || model.includes('lancool')) {
        return STUDIO_MEDIA_PATHS.caseXl;
      }
      if (
        part?.id === 'case-matx-compact' ||
        part?.id === 'case-matx-tight' ||
        (part?.supportedFormFactors &&
          !part.supportedFormFactors.includes('ATX'))
      ) {
        return STUDIO_MEDIA_PATHS.caseCompact;
      }
      return STUDIO_MEDIA_PATHS.caseAtX;
  }
}

export function findCatalogPart(
  category: PartCategoryKey,
  partId: string
): AnyCatalogPart | null {
  switch (category) {
    case 'cpu': {
      const part = CPU_DB.find((p) => p.id === partId);
      return part ? { category: 'cpu', part } : null;
    }
    case 'gpu': {
      const part = GPU_DB.find((p) => p.id === partId);
      return part ? { category: 'gpu', part } : null;
    }
    case 'motherboard': {
      const part = MOTHERBOARD_DB.find((p) => p.id === partId);
      return part ? { category: 'motherboard', part } : null;
    }
    case 'ram': {
      const part = RAM_DB.find((p) => p.id === partId);
      return part ? { category: 'ram', part } : null;
    }
    case 'ssd': {
      const part = SSD_DB.find((p) => p.id === partId);
      return part ? { category: 'ssd', part } : null;
    }
    case 'psu': {
      const part = PSU_DB.find((p) => p.id === partId);
      return part ? { category: 'psu', part } : null;
    }
    case 'pcCase': {
      const part = CASE_DB.find((p) => p.id === partId);
      return part ? { category: 'pcCase', part } : null;
    }
    case 'cooler': {
      const part = CPU_COOLER_DB.find((p) => p.id === partId);
      return part ? { category: 'cooler', part } : null;
    }
  }
}

export function getPartImageById(
  category: PartCategoryKey,
  partId: string
): string {
  const found = findCatalogPart(category, partId);
  if (found) {
    return getPartImage(category, found.part);
  }
  return getPartImage(category);
}

export function getAllCatalogEntries(): AnyCatalogPart[] {
  return [
    ...CPU_DB.filter((p) => !p.isUnverifiedSpecSample).map(
      (part): AnyCatalogPart => ({ category: 'cpu', part })
    ),
    ...GPU_DB.filter((p) => !p.isUnverifiedSpecSample).map(
      (part): AnyCatalogPart => ({ category: 'gpu', part })
    ),
    ...MOTHERBOARD_DB.filter((p) => !p.isUnverifiedSpecSample).map(
      (part): AnyCatalogPart => ({ category: 'motherboard', part })
    ),
    ...RAM_DB.filter((p) => !p.isUnverifiedSpecSample).map(
      (part): AnyCatalogPart => ({ category: 'ram', part })
    ),
    ...SSD_DB.filter((p) => !p.isUnverifiedSpecSample).map(
      (part): AnyCatalogPart => ({ category: 'ssd', part })
    ),
    ...PSU_DB.filter((p) => !p.isUnverifiedSpecSample).map(
      (part): AnyCatalogPart => ({ category: 'psu', part })
    ),
    ...CASE_DB.filter((p) => !p.isUnverifiedSpecSample).map(
      (part): AnyCatalogPart => ({ category: 'pcCase', part })
    ),
    ...CPU_COOLER_DB.filter((p) => !p.isUnverifiedSpecSample).map(
      (part): AnyCatalogPart => ({ category: 'cooler', part })
    ),
  ];
}
