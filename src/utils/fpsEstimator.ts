import { getMergedCatalogParts } from '../data/catalogAdapter';
import {
  CpuPart,
  GpuPart,
  PcBuild,
  PricingCatalogResponse,
  RamPart,
  TargetResolution,
} from '../types/pc';

export interface GameBenchmarkProfile {
  name: string;
  categoryLabel: string;
  cpuWeight: number;
  baseFpsAt60: number;
  exponent: number;
  upscalerFactor: number;
  minRecommendedVram1440: number;
  minRecommendedVram4k: number;
  qualityPresetByRes: Record<TargetResolution, string>;
  meterCeiling: number;
}

export interface EstimatedGameFps {
  game: string;
  categoryLabel: string;
  resolution: TargetResolution;
  qualityPresetLabel: string;
  avgFps: number;
  low1PercentFps: number;
  upscaledFps: number | null;
  upscalerLabel: string | null;
  verdictLabel: string;
  verdictTone: 'elite' | 'smooth' | 'playable' | 'low';
  barPercent: number;
}

export interface BuildWorkloadMetrics {
  gamingIndex: number;
  cpuRenderIndex: number;
  memoryVramIndex: number;
}

export const GAME_BENCHMARK_PROFILES: Record<string, GameBenchmarkProfile> = {
  Valorant: {
    name: 'Valorant',
    categoryLabel: 'Rekabetçi FPS',
    cpuWeight: 0.72,
    baseFpsAt60: 345,
    exponent: 1.52,
    upscalerFactor: 1.0,
    minRecommendedVram1440: 4,
    minRecommendedVram4k: 6,
    qualityPresetByRes: {
      '1080p': '1080p Rekabetçi Yüksek',
      '1440p': '1440p Yüksek',
      '4k': '4K Yüksek',
    },
    meterCeiling: 500,
  },
  'Counter-Strike 2': {
    name: 'Counter-Strike 2',
    categoryLabel: 'Rekabetçi FPS',
    cpuWeight: 0.56,
    baseFpsAt60: 215,
    exponent: 1.48,
    upscalerFactor: 1.12,
    minRecommendedVram1440: 6,
    minRecommendedVram4k: 8,
    qualityPresetByRes: {
      '1080p': '1080p Yüksek',
      '1440p': '1440p Yüksek',
      '4k': '4K Orta / Yüksek',
    },
    meterCeiling: 400,
  },
  'League of Legends': {
    name: 'League of Legends',
    categoryLabel: 'MOBA',
    cpuWeight: 0.74,
    baseFpsAt60: 305,
    exponent: 1.38,
    upscalerFactor: 1.0,
    minRecommendedVram1440: 4,
    minRecommendedVram4k: 4,
    qualityPresetByRes: {
      '1080p': '1080p En Yüksek',
      '1440p': '1440p En Yüksek',
      '4k': '4K En Yüksek',
    },
    meterCeiling: 450,
  },
  Fortnite: {
    name: 'Fortnite',
    categoryLabel: 'Battle Royale',
    cpuWeight: 0.44,
    baseFpsAt60: 165,
    exponent: 1.45,
    upscalerFactor: 1.32,
    minRecommendedVram1440: 8,
    minRecommendedVram4k: 12,
    qualityPresetByRes: {
      '1080p': '1080p Yüksek (Nanite Kapalı)',
      '1440p': '1440p Yüksek',
      '4k': '4K Yüksek',
    },
    meterCeiling: 300,
  },
  'PUBG: Battlegrounds': {
    name: 'PUBG: Battlegrounds',
    categoryLabel: 'Battle Royale',
    cpuWeight: 0.44,
    baseFpsAt60: 142,
    exponent: 1.42,
    upscalerFactor: 1.14,
    minRecommendedVram1440: 8,
    minRecommendedVram4k: 10,
    qualityPresetByRes: {
      '1080p': '1080p Ultra / Rekabetçi',
      '1440p': '1440p Yüksek',
      '4k': '4K Yüksek',
    },
    meterCeiling: 260,
  },
  'Apex Legends': {
    name: 'Apex Legends',
    categoryLabel: 'Rekabetçi FPS',
    cpuWeight: 0.42,
    baseFpsAt60: 158,
    exponent: 1.42,
    upscalerFactor: 1.1,
    minRecommendedVram1440: 6,
    minRecommendedVram4k: 8,
    qualityPresetByRes: {
      '1080p': '1080p Yüksek',
      '1440p': '1440p Yüksek',
      '4k': '4K Yüksek',
    },
    meterCeiling: 280,
  },
  'GTA V': {
    name: 'GTA V',
    categoryLabel: 'Açık Dünya',
    cpuWeight: 0.34,
    baseFpsAt60: 132,
    exponent: 1.38,
    upscalerFactor: 1.12,
    minRecommendedVram1440: 8,
    minRecommendedVram4k: 10,
    qualityPresetByRes: {
      '1080p': '1080p Çok Yüksek',
      '1440p': '1440p Çok Yüksek',
      '4k': '4K Yüksek',
    },
    meterCeiling: 220,
  },
  'Forza Horizon 5': {
    name: 'Forza Horizon 5',
    categoryLabel: 'Yarış / AAA',
    cpuWeight: 0.24,
    baseFpsAt60: 112,
    exponent: 1.42,
    upscalerFactor: 1.28,
    minRecommendedVram1440: 8,
    minRecommendedVram4k: 12,
    qualityPresetByRes: {
      '1080p': '1080p Ekstrem',
      '1440p': '1440p Ultra',
      '4k': '4K Ultra',
    },
    meterCeiling: 200,
  },
  "Baldur's Gate 3": {
    name: "Baldur's Gate 3",
    categoryLabel: 'RPG / AAA',
    cpuWeight: 0.38,
    baseFpsAt60: 98,
    exponent: 1.4,
    upscalerFactor: 1.3,
    minRecommendedVram1440: 8,
    minRecommendedVram4k: 12,
    qualityPresetByRes: {
      '1080p': '1080p Ultra',
      '1440p': '1440p Ultra',
      '4k': '4K Yüksek',
    },
    meterCeiling: 180,
  },
  'Red Dead Redemption 2': {
    name: 'Red Dead Redemption 2',
    categoryLabel: 'Açık Dünya AAA',
    cpuWeight: 0.24,
    baseFpsAt60: 84,
    exponent: 1.45,
    upscalerFactor: 1.32,
    minRecommendedVram1440: 8,
    minRecommendedVram4k: 12,
    qualityPresetByRes: {
      '1080p': '1080p Yüksek / Ultra',
      '1440p': '1440p Yüksek',
      '4k': '4K Yüksek',
    },
    meterCeiling: 165,
  },
  'Cyberpunk 2077': {
    name: 'Cyberpunk 2077',
    categoryLabel: 'Ağır AAA',
    cpuWeight: 0.24,
    baseFpsAt60: 74,
    exponent: 1.48,
    upscalerFactor: 1.42,
    minRecommendedVram1440: 10,
    minRecommendedVram4k: 16,
    qualityPresetByRes: {
      '1080p': '1080p Ultra (RT Kapalı)',
      '1440p': '1440p Yüksek',
      '4k': '4K Yüksek',
    },
    meterCeiling: 160,
  },
  'Alan Wake 2': {
    name: 'Alan Wake 2',
    categoryLabel: 'Yeni Nesil AAA',
    cpuWeight: 0.2,
    baseFpsAt60: 50,
    exponent: 1.52,
    upscalerFactor: 1.46,
    minRecommendedVram1440: 12,
    minRecommendedVram4k: 16,
    qualityPresetByRes: {
      '1080p': '1080p Yüksek',
      '1440p': '1440p Orta / Yüksek',
      '4k': '4K Orta',
    },
    meterCeiling: 130,
  },
};

function getDefaultGameProfile(gameName: string): GameBenchmarkProfile {
  return (
    GAME_BENCHMARK_PROFILES[gameName] ?? {
      name: gameName,
      categoryLabel: 'Popüler Oyun',
      cpuWeight: 0.35,
      baseFpsAt60: 105,
      exponent: 1.42,
      upscalerFactor: 1.25,
      minRecommendedVram1440: 8,
      minRecommendedVram4k: 12,
      qualityPresetByRes: {
        '1080p': '1080p Yüksek',
        '1440p': '1440p Yüksek',
        '4k': '4K Orta / Yüksek',
      },
      meterCeiling: 180,
    }
  );
}

function resolveBuildParts(
  build: PcBuild,
  catalog: PricingCatalogResponse | null
): { cpu: CpuPart | undefined; gpu: GpuPart | undefined; ram: RamPart | undefined } {
  const merged = getMergedCatalogParts(catalog);
  return {
    cpu: merged.cpus.find((c) => c.id === build.selectedIds.cpuId),
    gpu: merged.gpus.find((g) => g.id === build.selectedIds.gpuId),
    ram: merged.rams.find((r) => r.id === build.selectedIds.ramId),
  };
}

function getGpuResolutionScore(gpu: GpuPart | undefined, res: TargetResolution): number {
  if (!gpu) return 55;
  if (res === '4k') return gpu.score4k;
  if (res === '1440p') return gpu.score1440p;
  return gpu.score1080p;
}

export function estimateGameFps(
  build: PcBuild,
  gameName: string,
  resolution: TargetResolution,
  catalog: PricingCatalogResponse | null
): EstimatedGameFps {
  const profile = getDefaultGameProfile(gameName);
  const { cpu, gpu, ram } = resolveBuildParts(build, catalog);

  const cpuGaming = cpu?.gamingScore ?? 62;
  const gpuResScore = getGpuResolutionScore(gpu, resolution);
  const vram = gpu?.vramGb ?? 8;
  const isIntegrated = Boolean(gpu?.isIntegrated);

  const rawCombined =
    cpuGaming * profile.cpuWeight + gpuResScore * (1 - profile.cpuWeight);

  // Resolution scaling penalty when GPU bottlenecks CPU-heavy titles at higher resolutions
  const gpuBottleneckDampener =
    !isIntegrated && gpuResScore < cpuGaming - 15
      ? Math.max(0.68, 1 - (cpuGaming - gpuResScore - 15) * 0.008)
      : 1;

  let vramFactor = 1.0;
  if (!isIntegrated) {
    if (resolution === '4k' && vram < profile.minRecommendedVram4k) {
      vramFactor = vram <= 8 ? 0.72 : 0.86;
    } else if (resolution === '1440p' && vram < profile.minRecommendedVram1440) {
      vramFactor = vram < 8 ? 0.78 : 0.9;
    }
  }

  const ramCapacity = ram?.capacityGb ?? 16;
  const ramGenBonus = ram?.generation === 'DDR5' ? 1.03 : 1.0;
  const ramStabilityFactor = ramCapacity >= 32 ? 1.04 : 1.0;

  let avgFps = Math.round(
    profile.baseFpsAt60 *
      Math.pow(Math.max(10, rawCombined) / 60, profile.exponent) *
      gpuBottleneckDampener *
      vramFactor *
      ramGenBonus
  );

  if (isIntegrated) {
    // Dahili GPU (APU) için gerçekçi e-spor vs ağır AAA ayrımı
    avgFps = Math.max(10, Math.min(avgFps, profile.cpuWeight >= 0.55 ? 115 : 32));
  } else {
    avgFps = Math.max(22, avgFps);
  }

  // 1% Low FPS: X3D önbellek ve 32 GB+ RAM kare sürekliliğini artırır
  const isX3d = Boolean(cpu?.model.toLowerCase().includes('x3d'));
  const lowRatio = Math.min(
    0.84,
    0.66 + (isX3d ? 0.07 : 0) + (ramStabilityFactor > 1 ? 0.04 : 0) - (vramFactor < 1 ? 0.08 : 0)
  );
  const low1PercentFps = Math.max(12, Math.round(avgFps * lowRatio));

  const supportsUpscaler = !isIntegrated && profile.upscalerFactor >= 1.15;
  const upscaledFps = supportsUpscaler
    ? Math.round(avgFps * profile.upscalerFactor)
    : null;
  const upscalerLabel = supportsUpscaler
    ? gpu?.brand === 'NVIDIA' || gpu?.model.toLowerCase().includes('rtx')
      ? 'DLSS Kalite'
      : 'FSR Kalite'
    : null;

  let verdictLabel = 'Akıcı';
  let verdictTone: EstimatedGameFps['verdictTone'] = 'smooth';

  if (profile.cpuWeight >= 0.55) {
    if (avgFps >= 240) {
      verdictLabel = '240+ FPS Espor';
      verdictTone = 'elite';
    } else if (avgFps >= 144) {
      verdictLabel = '144+ Hz Akıcı';
      verdictTone = 'smooth';
    } else if (avgFps >= 60) {
      verdictLabel = 'Oynanabilir';
      verdictTone = 'playable';
    } else {
      verdictLabel = 'Ayar Düşürme Önerilir';
      verdictTone = 'low';
    }
  } else {
    if (avgFps >= 110) {
      verdictLabel = 'Çok Akıcı';
      verdictTone = 'elite';
    } else if (avgFps >= 60) {
      verdictLabel = 'Akıcı (60+ FPS)';
      verdictTone = 'smooth';
    } else if (avgFps >= 40) {
      verdictLabel = upscaledFps && upscaledFps >= 60 ? 'DLSS/FSR ile Akıcı' : 'Oynanabilir';
      verdictTone = 'playable';
    } else {
      verdictLabel = 'Ayar Düşürme Önerilir';
      verdictTone = 'low';
    }
  }

  const barPercent = Math.min(
    100,
    Math.max(8, Math.round((avgFps / profile.meterCeiling) * 100))
  );

  return {
    game: gameName,
    categoryLabel: profile.categoryLabel,
    resolution,
    qualityPresetLabel: profile.qualityPresetByRes[resolution],
    avgFps,
    low1PercentFps,
    upscaledFps,
    upscalerLabel,
    verdictLabel,
    verdictTone,
    barPercent,
  };
}

export function getBuildWorkloadMetrics(
  build: PcBuild,
  catalog: PricingCatalogResponse | null
): BuildWorkloadMetrics {
  const { cpu, gpu, ram } = resolveBuildParts(build, catalog);
  const cpuGaming = cpu?.gamingScore ?? 60;
  const cpuProd = cpu?.productivityScore ?? 60;
  const gpuScore = getGpuResolutionScore(gpu, build.targetResolution);
  const vram = gpu?.vramGb ?? 8;
  const ramCap = ram?.capacityGb ?? 16;

  const gamingIndex = Math.min(
    100,
    Math.round(cpuGaming * 0.32 + gpuScore * 0.68)
  );
  const cpuRenderIndex = Math.min(
    100,
    Math.round(cpuProd * 0.72 + (gpu?.supportsNvenc ? 18 : 10) + (ramCap >= 32 ? 10 : 4))
  );
  const memoryVramIndex = Math.min(
    100,
    Math.round(
      Math.min(50, (ramCap / 64) * 50) +
        Math.min(40, (vram / 20) * 40) +
        (ram?.generation === 'DDR5' ? 10 : 4)
    )
  );

  return {
    gamingIndex,
    cpuRenderIndex,
    memoryVramIndex,
  };
}
