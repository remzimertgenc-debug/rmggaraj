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
import type {
  CasePart,
  CoolerPart,
  CpuGeneration,
  CpuPart,
  CpuSocket,
  DynamicCatalogProduct,
  FormFactor,
  GpuPart,
  MotherboardPart,
  PartCategoryKey,
  PricingCatalogResponse,
  PsuPart,
  RamGeneration,
  RamPart,
  SsdPart,
} from '../types/pc';

function splitCsv(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseCpuGeneration(text: string): CpuGeneration | null {
  const up = text.toUpperCase();
  if (up.includes('CORE ULTRA 200') || up.includes('ULTRA 5 2') || up.includes('ULTRA 7 2') || up.includes('ULTRA 9 2')) {
    return 'Core Ultra 200';
  }
  if (up.includes('9600X') || up.includes('9700X') || up.includes('9800X3D') || up.includes('9900X') || up.includes('9950X')) {
    return 'Ryzen 9000';
  }
  if (up.includes('7500F') || up.includes('7600') || up.includes('7700') || up.includes('7800X3D') || up.includes('7900') || up.includes('7950')) {
    return 'Ryzen 7000';
  }
  if (up.includes('8400') || up.includes('8500') || up.includes('8600') || up.includes('8700')) {
    return 'Ryzen 8000';
  }
  if (up.includes('5500') || up.includes('5600') || up.includes('5700') || up.includes('5800') || up.includes('5900') || up.includes('5950')) {
    return 'Ryzen 5000';
  }
  if (up.includes('4100') || up.includes('4500') || up.includes('4600')) {
    return 'Ryzen 4000';
  }
  if (up.includes('3600') || up.includes('3700') || up.includes('3800') || up.includes('3900')) {
    return 'Ryzen 3000';
  }
  if (up.includes('14100') || up.includes('14400') || up.includes('14600') || up.includes('14700') || up.includes('14900')) {
    return 'Intel 14. Nesil';
  }
  if (up.includes('13400') || up.includes('13600') || up.includes('13700') || up.includes('13900')) {
    return 'Intel 13. Nesil';
  }
  if (up.includes('12100') || up.includes('12400') || up.includes('12600') || up.includes('12700') || up.includes('12900')) {
    return 'Intel 12. Nesil';
  }
  if (up.includes('11400') || up.includes('11600') || up.includes('11700') || up.includes('11900')) {
    return 'Intel 11. Nesil';
  }
  if (up.includes('10100') || up.includes('10400') || up.includes('10600') || up.includes('10700') || up.includes('10900')) {
    return 'Intel 10. Nesil';
  }
  return null;
}

export function adaptDbCpu(prod: DynamicCatalogProduct): CpuPart {
  const hay = `${prod.name} ${prod.specSummary}`;
  const coresMatch = hay.match(/(\d+)\s*[ÇC]ekirdek/i);
  const threadsMatch = hay.match(/(\d+)\s*[İI]zlek/i);
  const clockMatch = hay.match(/(\d+(?:\.\d+)?)\s*GHz/i);
  const socket = (prod.socket?.trim() || 'AM5') as CpuSocket;
  const ramTokens = splitCsv(prod.ramType).filter(
    (r): r is RamGeneration => r === 'DDR4' || r === 'DDR5'
  );
  const tdp = prod.tdp ?? 65;

  return {
    id: prod.id,
    brand: prod.brand,
    model: prod.name,
    tierLevel: tdp >= 180 ? 5 : tdp >= 135 ? 4 : tdp >= 95 ? 3 : 2,
    specSummary: prod.specSummary,
    socket,
    generation: parseCpuGeneration(hay),
    cores: coresMatch ? Number(coresMatch[1]) : 6,
    threads: threadsMatch ? Number(threadsMatch[1]) : 12,
    boostClockGhz: clockMatch ? Number(clockMatch[1]) : 4.6,
    tdpWatts: tdp,
    maxPowerWatts: tdp,
    requiresDedicatedCooler: tdp > 95,
    hasIntegratedGraphics: !hay.toUpperCase().includes('F ') && !hay.toUpperCase().endsWith('F'),
    supportedRam: ramTokens.length > 0 ? ramTokens : [socket === 'AM4' || socket === 'LGA1200' ? 'DDR4' : 'DDR5'],
    gamingScore: tdp >= 140 ? 88 : 72,
    productivityScore: tdp >= 180 ? 92 : 70,
  };
}

export function adaptDbGpu(prod: DynamicCatalogProduct): GpuPart {
  const hay = `${prod.name} ${prod.specSummary}`;
  const vramMatch = hay.match(/(\d+)\s*GB/i);
  const vramGb = vramMatch ? Number(vramMatch[1]) : 8;
  const tdp = prod.tdp ?? 160;
  const recPsu = prod.wattage ?? 600;
  const lengthMm = prod.maxGpuLengthMm ?? 260;

  return {
    id: prod.id,
    brand: prod.brand,
    model: prod.name,
    shortTitle: prod.name.replace(new RegExp(`^${prod.brand}\\s+`, 'i'), ''),
    tierLevel: vramGb >= 24 ? 5 : vramGb >= 16 ? 4 : vramGb >= 12 ? 3 : 2,
    specSummary: prod.specSummary,
    vramGb,
    tdpWatts: tdp,
    peakPowerWatts: tdp,
    lengthMm,
    widthSlots: lengthMm >= 300 ? 3 : 2,
    recommendedPsuWatts: recPsu,
    requiredConnectors: {
      eightPinCount: tdp >= 280 ? 2 : 1,
      twelveVhpwrCount: tdp >= 250 && prod.name.includes('RTX') ? 1 : 0,
    },
    supportsNvenc: prod.name.toUpperCase().includes('RTX'),
    isIntegrated: false,
    score1080p: Math.min(99, 65 + Math.round(tdp / 10)),
    score1440p: Math.min(99, 55 + Math.round(tdp / 10)),
    score4k: Math.min(99, 40 + Math.round(tdp / 10)),
  };
}

export function adaptDbMotherboard(prod: DynamicCatalogProduct): MotherboardPart {
  const hay = `${prod.name} ${prod.specSummary}`;
  const up = hay.toUpperCase();
  const vrmMatch = hay.match(/VRM\s*(\d+)\s*W/i);
  const m2Match = hay.match(/(\d+)x\s*M\.2/i);
  const socket = (prod.socket?.trim() || 'AM5') as CpuSocket;
  const ramType = (prod.ramType?.trim() || 'DDR5') as RamGeneration;
  const formFactor = (prod.formFactor?.trim() || 'ATX') as FormFactor;

  let nativeCpuGenerations: CpuGeneration[] = [];
  let biosUpdateCpuGenerations: CpuGeneration[] = [];

  if (socket === 'AM4') {
    if (up.includes('A320') || up.includes('B450')) {
      nativeCpuGenerations = ['Ryzen 3000', 'Ryzen 4000'];
      biosUpdateCpuGenerations = ['Ryzen 5000'];
    } else {
      nativeCpuGenerations = ['Ryzen 3000', 'Ryzen 4000', 'Ryzen 5000'];
    }
  } else if (socket === 'AM5') {
    if (up.includes('X870') || up.includes('B850') || up.includes('B840')) {
      nativeCpuGenerations = ['Ryzen 7000', 'Ryzen 8000', 'Ryzen 9000'];
    } else {
      nativeCpuGenerations = ['Ryzen 7000', 'Ryzen 8000'];
      biosUpdateCpuGenerations = ['Ryzen 9000'];
    }
  } else if (socket === 'LGA1200') {
    if (up.includes('H410') || up.includes('B460') || up.includes('Z490')) {
      nativeCpuGenerations = ['Intel 10. Nesil'];
      biosUpdateCpuGenerations = ['Intel 11. Nesil'];
    } else {
      nativeCpuGenerations = ['Intel 10. Nesil', 'Intel 11. Nesil'];
    }
  } else if (socket === 'LGA1700') {
    if (up.includes('H610') || up.includes('B660') || up.includes('Z690')) {
      nativeCpuGenerations = ['Intel 12. Nesil', 'Intel 13. Nesil'];
      biosUpdateCpuGenerations = ['Intel 14. Nesil'];
    } else {
      nativeCpuGenerations = ['Intel 12. Nesil', 'Intel 13. Nesil', 'Intel 14. Nesil'];
    }
  } else if (socket === 'LGA1851') {
    nativeCpuGenerations = ['Core Ultra 200'];
  }

  return {
    id: prod.id,
    brand: prod.brand,
    model: prod.name,
    tierLevel: vrmMatch && Number(vrmMatch[1]) >= 220 ? 5 : 3,
    specSummary: prod.specSummary,
    socket,
    nativeCpuGenerations,
    biosUpdateCpuGenerations,
    hasBiosFlashback: true,
    supportedRam: ramType,
    ramSlots: formFactor === 'Mini-ITX' ? 2 : 4,
    maxRamGb: formFactor === 'Mini-ITX' ? 96 : 192,
    maxRamSpeedMhz: ramType === 'DDR5' ? 7600 : 4400,
    vrmMaxCpuWatts: vrmMatch ? Number(vrmMatch[1]) : 180,
    formFactor,
    m2Slots: m2Match ? Number(m2Match[1]) : 2,
    cpuEpsConnectors: vrmMatch && Number(vrmMatch[1]) >= 220 ? 2 : 1,
  };
}

export function adaptDbRam(prod: DynamicCatalogProduct): RamPart {
  const hay = `${prod.name} ${prod.specSummary}`;
  const capMatch = hay.match(/\b(8|16|32|48|64|96|128)\s*GB\b/i);
  const kitMatch = hay.match(/\((\d+)x\d+GB\)/i);
  const speedMatch = hay.match(/(\d{4})\s*MHz/i);
  const clMatch = hay.match(/\b(CL\d+)\b/i);
  const gen = (prod.ramType?.trim() === 'DDR4' ? 'DDR4' : 'DDR5') as RamGeneration;
  const cap = capMatch ? Number(capMatch[1]) : 32;
  const modulesCount = kitMatch ? Number(kitMatch[1]) : 2;

  return {
    id: prod.id,
    brand: prod.brand,
    model: prod.name,
    tierLevel: cap >= 64 ? 5 : cap >= 32 ? 4 : 2,
    specSummary: prod.specSummary,
    generation: gen,
    capacityGb: cap,
    modulesCount,
    speedMhz: speedMatch ? Number(speedMatch[1]) : gen === 'DDR5' ? 6000 : 3200,
    latency: clMatch ? clMatch[1].toUpperCase() : gen === 'DDR5' ? 'CL30' : 'CL16',
    channelConfig:
      modulesCount >= 4 ? 'Dört Modül' : modulesCount >= 2 ? 'Çift Kanal' : 'Tek Modül',
  };
}

export function adaptDbSsd(prod: DynamicCatalogProduct): SsdPart {
  const hay = `${prod.name} ${prod.specSummary}`;
  const tbMatch = hay.match(/\b([1248])\s*TB\b/i);
  const gbMatch = hay.match(/\b(256|500|512)\s*GB\b/i);
  const speedMatch = hay.match(/(\d{4,5})\s*MB\/s/i);
  const capacityGb = tbMatch ? Number(tbMatch[1]) * 1000 : gbMatch ? Number(gbMatch[1]) : 1000;
  const interfaceType = hay.toUpperCase().includes('PCIE 5.0')
    ? 'PCIe 5.0'
    : hay.toUpperCase().includes('PCIE 3.0')
      ? 'PCIe 3.0'
      : 'PCIe 4.0';

  return {
    id: prod.id,
    brand: prod.brand,
    model: prod.name,
    tierLevel: interfaceType === 'PCIe 5.0' ? 5 : capacityGb >= 2000 ? 4 : 3,
    specSummary: prod.specSummary,
    capacityGb,
    interfaceType,
    readSpeedMb: speedMatch ? Number(speedMatch[1]) : 7000,
    hasDramCache: interfaceType !== 'PCIe 3.0',
  };
}

export function adaptDbPsu(prod: DynamicCatalogProduct): PsuPart {
  const hay = `${prod.name} ${prod.specSummary}`;
  const wattage = prod.wattage ?? 650;
  const efficiency = hay.toUpperCase().includes('PLATINUM')
    ? '80+ Platinum'
    : hay.toUpperCase().includes('GOLD')
      ? '80+ Gold'
      : '80+ Bronze';

  return {
    id: prod.id,
    brand: prod.brand,
    model: prod.name,
    tierLevel: wattage >= 1000 ? 5 : wattage >= 750 ? 4 : 2,
    specSummary: prod.specSummary,
    wattage,
    efficiency,
    modular: hay.includes('Yarı Modüler') ? 'Yarı Modüler' : 'Tam Modüler',
    atxStandard: prod.formFactor?.includes('3.1') ? 'ATX 3.1' : 'ATX 3.0',
    connectors: {
      pcie8PinCount: wattage >= 850 ? 4 : wattage >= 650 ? 3 : 2,
      twelveVhpwrCount: wattage >= 750 || hay.includes('ATX 3.') ? 1 : 0,
      eps8PinCount: wattage >= 750 ? 2 : 1,
    },
  };
}

export function adaptDbCase(prod: DynamicCatalogProduct): CasePart {
  const hay = `${prod.name} ${prod.specSummary}`;
  const forms = splitCsv(prod.formFactor).filter(
    (f): f is FormFactor => f === 'ATX' || f === 'Micro-ATX' || f === 'Mini-ITX'
  );
  const supportedFormFactors: FormFactor[] =
    forms.length > 0 ? forms : ['ATX', 'Micro-ATX', 'Mini-ITX'];
  const maxGpuLengthMm = prod.maxGpuLengthMm ?? 380;

  return {
    id: prod.id,
    brand: prod.brand,
    model: prod.name,
    tierLevel: maxGpuLengthMm >= 410 ? 5 : maxGpuLengthMm >= 360 ? 4 : 3,
    specSummary: prod.specSummary,
    supportedFormFactors,
    maxGpuLengthMm,
    maxCoolerHeightMm: supportedFormFactors.includes('ATX') ? 175 : 160,
    supportedRadiatorMm: supportedFormFactors.includes('ATX') ? [240, 280, 360] : [240],
    airflowType: hay.includes('Akvaryum') ? 'Panoramik Cam Akvaryum' : 'Yüksek Hava Akışı (Mesh)',
    expansionSlots: supportedFormFactors.includes('ATX') ? 7 : 4,
  };
}

export function adaptDbCooler(prod: DynamicCatalogProduct): CoolerPart {
  const hay = `${prod.name} ${prod.specSummary}`;
  const isLiquid =
    prod.formFactor === 'Sıvı Soğutma' ||
    hay.toUpperCase().includes('SIVI') ||
    hay.toUpperCase().includes('AIO');
  const radMatch = hay.match(/(240|280|360)\s*mm/i);
  const sockets = splitCsv(prod.socket) as CpuSocket[];

  return {
    id: prod.id,
    brand: prod.brand,
    model: prod.name,
    tierLevel: isLiquid && radMatch?.[1] === '360' ? 5 : isLiquid ? 4 : 3,
    specSummary: prod.specSummary,
    coolerType: isLiquid ? 'Sıvı Soğutma' : 'Hava Soğutma',
    supportedSockets: sockets.length > 0 ? sockets : ['AM4', 'AM5', 'LGA1200', 'LGA1700', 'LGA1851'],
    maxTdpCapacityWatts: prod.wattage ?? (isLiquid ? 300 : 220),
    heightMm: isLiquid ? null : 158,
    radiatorMm: isLiquid ? (radMatch ? Number(radMatch[1]) : 240) : null,
  };
}

export function getMergedCatalogParts(pricingCatalog: PricingCatalogResponse | null): {
  cpus: CpuPart[];
  gpus: GpuPart[];
  motherboards: MotherboardPart[];
  rams: RamPart[];
  ssds: SsdPart[];
  psus: PsuPart[];
  cases: CasePart[];
  coolers: CoolerPart[];
} {
  const cpus = [...CPU_DB];
  const gpus = [...GPU_DB];
  const motherboards = [...MOTHERBOARD_DB];
  const rams = [...RAM_DB];
  const ssds = [...SSD_DB];
  const psus = [...PSU_DB];
  const cases = [...CASE_DB];
  const coolers = [...CPU_COOLER_DB];

  const existingIds = new Set<string>([
    ...cpus.map((x) => x.id),
    ...gpus.map((x) => x.id),
    ...motherboards.map((x) => x.id),
    ...rams.map((x) => x.id),
    ...ssds.map((x) => x.id),
    ...psus.map((x) => x.id),
    ...cases.map((x) => x.id),
    ...coolers.map((x) => x.id),
  ]);

  for (const prod of pricingCatalog?.catalogProducts ?? []) {
    if (existingIds.has(prod.id)) continue;
    existingIds.add(prod.id);

    switch (prod.category) {
      case 'cpu':
        cpus.push(adaptDbCpu(prod));
        break;
      case 'gpu':
        gpus.push(adaptDbGpu(prod));
        break;
      case 'motherboard':
        motherboards.push(adaptDbMotherboard(prod));
        break;
      case 'ram':
        rams.push(adaptDbRam(prod));
        break;
      case 'ssd':
        ssds.push(adaptDbSsd(prod));
        break;
      case 'psu':
        psus.push(adaptDbPsu(prod));
        break;
      case 'pcCase':
        cases.push(adaptDbCase(prod));
        break;
      case 'cooler':
        coolers.push(adaptDbCooler(prod));
        break;
    }
  }

  return { cpus, gpus, motherboards, rams, ssds, psus, cases, coolers };
}

export function findMergedPartById(
  category: PartCategoryKey,
  partId: string,
  pricingCatalog: PricingCatalogResponse | null
) {
  const merged = getMergedCatalogParts(pricingCatalog);
  switch (category) {
    case 'cpu': {
      const part = merged.cpus.find((p) => p.id === partId);
      return part ? ({ category: 'cpu', part } as const) : null;
    }
    case 'gpu': {
      const part = merged.gpus.find((p) => p.id === partId);
      return part ? ({ category: 'gpu', part } as const) : null;
    }
    case 'motherboard': {
      const part = merged.motherboards.find((p) => p.id === partId);
      return part ? ({ category: 'motherboard', part } as const) : null;
    }
    case 'ram': {
      const part = merged.rams.find((p) => p.id === partId);
      return part ? ({ category: 'ram', part } as const) : null;
    }
    case 'ssd': {
      const part = merged.ssds.find((p) => p.id === partId);
      return part ? ({ category: 'ssd', part } as const) : null;
    }
    case 'psu': {
      const part = merged.psus.find((p) => p.id === partId);
      return part ? ({ category: 'psu', part } as const) : null;
    }
    case 'pcCase': {
      const part = merged.cases.find((p) => p.id === partId);
      return part ? ({ category: 'pcCase', part } as const) : null;
    }
    case 'cooler': {
      const part = merged.coolers.find((p) => p.id === partId);
      return part ? ({ category: 'cooler', part } as const) : null;
    }
  }
}
