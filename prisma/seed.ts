import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { sql } from 'drizzle-orm';
import {
  CASE_DB,
  CPU_COOLER_DB,
  CPU_DB,
  GPU_DB,
  MOTHERBOARD_DB,
  PSU_DB,
  RAM_DB,
  SSD_DB,
} from '../shared/hardwareCatalog.ts';
import { getPartImage, STUDIO_MEDIA_PATHS } from '../src/data/partMedia.ts';
import { createPool, db } from '../src/db/index.ts';
import { products } from '../src/db/schema.ts';
import type { PartCategoryKey } from '../src/types/pc.ts';

interface SeedProductRecord {
  id: string;
  category: PartCategoryKey;
  brand: string;
  name: string;
  specSummary: string;
  imageUrl: string | null;
  socket: string | null;
  ramType: string | null;
  formFactor: string | null;
  tdp: number | null;
  wattage: number | null;
  maxGpuLengthMm: number | null;
  isCatalogCore: boolean;
  sourceStore: string | null;
  externalUrl: string | null;
}

function slugify(value: string): string {
  return value
    .toLocaleLowerCase('en-US')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================================================
// 1. ÇEKİRDEK STATİK KATALOG (shared/hardwareCatalog.ts)
// ============================================================================
function buildStaticCoreRecords(): SeedProductRecord[] {
  const records: SeedProductRecord[] = [];

  for (const cpu of CPU_DB) {
    records.push({
      id: cpu.id,
      category: 'cpu',
      brand: cpu.brand,
      name: cpu.model,
      specSummary: cpu.specSummary,
      imageUrl: getPartImage('cpu', cpu),
      socket: cpu.socket,
      ramType: cpu.supportedRam.join(','),
      formFactor: null,
      tdp: cpu.maxPowerWatts ?? cpu.tdpWatts ?? 65,
      wattage: null,
      maxGpuLengthMm: null,
      isCatalogCore: true,
      sourceStore: 'RMG Garaj Katalog',
      externalUrl: null,
    });
  }

  for (const gpu of GPU_DB) {
    records.push({
      id: gpu.id,
      category: 'gpu',
      brand: gpu.brand,
      name: gpu.model,
      specSummary: gpu.specSummary,
      imageUrl: getPartImage('gpu', gpu),
      socket: null,
      ramType: null,
      formFactor: gpu.isIntegrated ? 'Integrated' : 'PCIe',
      tdp: gpu.peakPowerWatts ?? gpu.tdpWatts ?? (gpu.isIntegrated ? 0 : 150),
      wattage: gpu.recommendedPsuWatts ?? null,
      maxGpuLengthMm: gpu.lengthMm ?? null,
      isCatalogCore: true,
      sourceStore: 'RMG Garaj Katalog',
      externalUrl: null,
    });
  }

  for (const mb of MOTHERBOARD_DB) {
    records.push({
      id: mb.id,
      category: 'motherboard',
      brand: mb.brand,
      name: mb.model,
      specSummary: mb.specSummary,
      imageUrl: getPartImage('motherboard', mb),
      socket: mb.socket,
      ramType: mb.supportedRam,
      formFactor: mb.formFactor,
      tdp: 45,
      wattage: null,
      maxGpuLengthMm: null,
      isCatalogCore: true,
      sourceStore: 'RMG Garaj Katalog',
      externalUrl: null,
    });
  }

  for (const ram of RAM_DB) {
    records.push({
      id: ram.id,
      category: 'ram',
      brand: ram.brand,
      name: ram.model,
      specSummary: ram.specSummary,
      imageUrl: getPartImage('ram', ram),
      socket: null,
      ramType: ram.generation,
      formFactor: 'DIMM',
      tdp: 10,
      wattage: null,
      maxGpuLengthMm: null,
      isCatalogCore: true,
      sourceStore: 'RMG Garaj Katalog',
      externalUrl: null,
    });
  }

  for (const ssd of SSD_DB) {
    records.push({
      id: ssd.id,
      category: 'ssd',
      brand: ssd.brand,
      name: ssd.model,
      specSummary: ssd.specSummary,
      imageUrl: getPartImage('ssd', ssd),
      socket: null,
      ramType: null,
      formFactor: 'M.2',
      tdp: 8,
      wattage: null,
      maxGpuLengthMm: null,
      isCatalogCore: true,
      sourceStore: 'RMG Garaj Katalog',
      externalUrl: null,
    });
  }

  for (const psu of PSU_DB) {
    records.push({
      id: psu.id,
      category: 'psu',
      brand: psu.brand,
      name: psu.model,
      specSummary: psu.specSummary,
      imageUrl: getPartImage('psu', psu),
      socket: null,
      ramType: null,
      formFactor: psu.atxStandard ?? 'ATX',
      tdp: 0,
      wattage: psu.wattage,
      maxGpuLengthMm: null,
      isCatalogCore: true,
      sourceStore: 'RMG Garaj Katalog',
      externalUrl: null,
    });
  }

  for (const pcCase of CASE_DB) {
    records.push({
      id: pcCase.id,
      category: 'pcCase',
      brand: pcCase.brand,
      name: pcCase.model,
      specSummary: pcCase.specSummary,
      imageUrl: getPartImage('pcCase', pcCase),
      socket: null,
      ramType: null,
      formFactor: pcCase.supportedFormFactors.join(','),
      tdp: 0,
      wattage: null,
      maxGpuLengthMm: pcCase.maxGpuLengthMm ?? null,
      isCatalogCore: true,
      sourceStore: 'RMG Garaj Katalog',
      externalUrl: null,
    });
  }

  for (const cooler of CPU_COOLER_DB) {
    records.push({
      id: cooler.id,
      category: 'cooler',
      brand: cooler.brand,
      name: cooler.model,
      specSummary: cooler.specSummary,
      imageUrl: getPartImage('cooler', cooler),
      socket: cooler.supportedSockets.join(','),
      ramType: null,
      formFactor: cooler.coolerType,
      tdp: cooler.coolerType === 'Sıvı Soğutma' ? 18 : 8,
      wattage: cooler.maxTdpCapacityWatts ?? null,
      maxGpuLengthMm: null,
      isCatalogCore: true,
      sourceStore: 'RMG Garaj Katalog',
      externalUrl: null,
    });
  }

  return records;
}

// ============================================================================
// 2. OTOMATİK İŞLEMCİ ÜRETİCİ (AM4, AM5, LGA1200, LGA1700, LGA1851)
// ============================================================================
function generateExtendedCpus(): SeedProductRecord[] {
  interface CpuBlueprint {
    brand: 'AMD' | 'Intel';
    model: string;
    socket: 'AM4' | 'AM5' | 'LGA1200' | 'LGA1700' | 'LGA1851';
    ramType: 'DDR4' | 'DDR5' | 'DDR4,DDR5';
    cores: number;
    threads: number;
    clock: string;
    tdp: number;
    gen: string;
  }

  const blueprints: CpuBlueprint[] = [
    // AMD AM4 (DDR4)
    { brand: 'AMD', model: 'AMD Ryzen 3 4100', socket: 'AM4', ramType: 'DDR4', cores: 4, threads: 8, clock: '4.0', tdp: 65, gen: 'Ryzen 4000' },
    { brand: 'AMD', model: 'AMD Ryzen 5 3600', socket: 'AM4', ramType: 'DDR4', cores: 6, threads: 12, clock: '4.2', tdp: 88, gen: 'Ryzen 3000' },
    { brand: 'AMD', model: 'AMD Ryzen 5 5500', socket: 'AM4', ramType: 'DDR4', cores: 6, threads: 12, clock: '4.2', tdp: 88, gen: 'Ryzen 5000' },
    { brand: 'AMD', model: 'AMD Ryzen 5 5600X', socket: 'AM4', ramType: 'DDR4', cores: 6, threads: 12, clock: '4.6', tdp: 88, gen: 'Ryzen 5000' },
    { brand: 'AMD', model: 'AMD Ryzen 7 5700X', socket: 'AM4', ramType: 'DDR4', cores: 8, threads: 16, clock: '4.6', tdp: 88, gen: 'Ryzen 5000' },
    { brand: 'AMD', model: 'AMD Ryzen 7 5700X3D', socket: 'AM4', ramType: 'DDR4', cores: 8, threads: 16, clock: '4.1', tdp: 105, gen: 'Ryzen 5000' },
    { brand: 'AMD', model: 'AMD Ryzen 7 5800X', socket: 'AM4', ramType: 'DDR4', cores: 8, threads: 16, clock: '4.7', tdp: 142, gen: 'Ryzen 5000' },
    { brand: 'AMD', model: 'AMD Ryzen 7 5800X3D', socket: 'AM4', ramType: 'DDR4', cores: 8, threads: 16, clock: '4.5', tdp: 142, gen: 'Ryzen 5000' },
    { brand: 'AMD', model: 'AMD Ryzen 9 5900X', socket: 'AM4', ramType: 'DDR4', cores: 12, threads: 24, clock: '4.8', tdp: 142, gen: 'Ryzen 5000' },
    { brand: 'AMD', model: 'AMD Ryzen 9 5950X', socket: 'AM4', ramType: 'DDR4', cores: 16, threads: 32, clock: '4.9', tdp: 142, gen: 'Ryzen 5000' },

    // AMD AM5 (DDR5)
    { brand: 'AMD', model: 'AMD Ryzen 5 8400F', socket: 'AM5', ramType: 'DDR5', cores: 6, threads: 12, clock: '4.7', tdp: 88, gen: 'Ryzen 8000' },
    { brand: 'AMD', model: 'AMD Ryzen 5 8500G', socket: 'AM5', ramType: 'DDR5', cores: 6, threads: 12, clock: '5.0', tdp: 88, gen: 'Ryzen 8000' },
    { brand: 'AMD', model: 'AMD Ryzen 5 7600', socket: 'AM5', ramType: 'DDR5', cores: 6, threads: 12, clock: '5.1', tdp: 88, gen: 'Ryzen 7000' },
    { brand: 'AMD', model: 'AMD Ryzen 5 7600X', socket: 'AM5', ramType: 'DDR5', cores: 6, threads: 12, clock: '5.3', tdp: 142, gen: 'Ryzen 7000' },
    { brand: 'AMD', model: 'AMD Ryzen 5 9600X', socket: 'AM5', ramType: 'DDR5', cores: 6, threads: 12, clock: '5.4', tdp: 88, gen: 'Ryzen 9000' },
    { brand: 'AMD', model: 'AMD Ryzen 7 7700', socket: 'AM5', ramType: 'DDR5', cores: 8, threads: 16, clock: '5.3', tdp: 88, gen: 'Ryzen 7000' },
    { brand: 'AMD', model: 'AMD Ryzen 7 9700X', socket: 'AM5', ramType: 'DDR5', cores: 8, threads: 16, clock: '5.5', tdp: 88, gen: 'Ryzen 9000' },
    { brand: 'AMD', model: 'AMD Ryzen 7 9800X3D', socket: 'AM5', ramType: 'DDR5', cores: 8, threads: 16, clock: '5.2', tdp: 162, gen: 'Ryzen 9000' },
    { brand: 'AMD', model: 'AMD Ryzen 9 7900X', socket: 'AM5', ramType: 'DDR5', cores: 12, threads: 24, clock: '5.6', tdp: 230, gen: 'Ryzen 7000' },
    { brand: 'AMD', model: 'AMD Ryzen 9 7950X', socket: 'AM5', ramType: 'DDR5', cores: 16, threads: 32, clock: '5.7', tdp: 230, gen: 'Ryzen 7000' },
    { brand: 'AMD', model: 'AMD Ryzen 9 7950X3D', socket: 'AM5', ramType: 'DDR5', cores: 16, threads: 32, clock: '5.7', tdp: 162, gen: 'Ryzen 7000' },
    { brand: 'AMD', model: 'AMD Ryzen 9 9900X', socket: 'AM5', ramType: 'DDR5', cores: 12, threads: 24, clock: '5.6', tdp: 162, gen: 'Ryzen 9000' },
    { brand: 'AMD', model: 'AMD Ryzen 9 9950X3D', socket: 'AM5', ramType: 'DDR5', cores: 16, threads: 32, clock: '5.7', tdp: 200, gen: 'Ryzen 9000' },

    // Intel LGA1200 (DDR4)
    { brand: 'Intel', model: 'Intel Core i3-10100F', socket: 'LGA1200', ramType: 'DDR4', cores: 4, threads: 8, clock: '4.3', tdp: 65, gen: 'Intel 10. Nesil' },
    { brand: 'Intel', model: 'Intel Core i5-10400F', socket: 'LGA1200', ramType: 'DDR4', cores: 6, threads: 12, clock: '4.3', tdp: 95, gen: 'Intel 10. Nesil' },
    { brand: 'Intel', model: 'Intel Core i5-11400F', socket: 'LGA1200', ramType: 'DDR4', cores: 6, threads: 12, clock: '4.4', tdp: 125, gen: 'Intel 11. Nesil' },
    { brand: 'Intel', model: 'Intel Core i7-10700K', socket: 'LGA1200', ramType: 'DDR4', cores: 8, threads: 16, clock: '5.1', tdp: 185, gen: 'Intel 10. Nesil' },
    { brand: 'Intel', model: 'Intel Core i7-11700K', socket: 'LGA1200', ramType: 'DDR4', cores: 8, threads: 16, clock: '5.0', tdp: 205, gen: 'Intel 11. Nesil' },
    { brand: 'Intel', model: 'Intel Core i9-11900K', socket: 'LGA1200', ramType: 'DDR4', cores: 8, threads: 16, clock: '5.3', tdp: 250, gen: 'Intel 11. Nesil' },

    // Intel LGA1700 (DDR4 & DDR5)
    { brand: 'Intel', model: 'Intel Core i3-12100F', socket: 'LGA1700', ramType: 'DDR4,DDR5', cores: 4, threads: 8, clock: '4.3', tdp: 89, gen: 'Intel 12. Nesil' },
    { brand: 'Intel', model: 'Intel Core i5-12400F', socket: 'LGA1700', ramType: 'DDR4,DDR5', cores: 6, threads: 12, clock: '4.4', tdp: 117, gen: 'Intel 12. Nesil' },
    { brand: 'Intel', model: 'Intel Core i5-12600KF', socket: 'LGA1700', ramType: 'DDR4,DDR5', cores: 10, threads: 16, clock: '4.9', tdp: 150, gen: 'Intel 12. Nesil' },
    { brand: 'Intel', model: 'Intel Core i5-13600K', socket: 'LGA1700', ramType: 'DDR4,DDR5', cores: 14, threads: 20, clock: '5.1', tdp: 181, gen: 'Intel 13. Nesil' },
    { brand: 'Intel', model: 'Intel Core i5-14600KF', socket: 'LGA1700', ramType: 'DDR4,DDR5', cores: 14, threads: 20, clock: '5.3', tdp: 181, gen: 'Intel 14. Nesil' },
    { brand: 'Intel', model: 'Intel Core i7-12700K', socket: 'LGA1700', ramType: 'DDR4,DDR5', cores: 12, threads: 20, clock: '5.0', tdp: 190, gen: 'Intel 12. Nesil' },
    { brand: 'Intel', model: 'Intel Core i7-13700KF', socket: 'LGA1700', ramType: 'DDR4,DDR5', cores: 16, threads: 24, clock: '5.4', tdp: 253, gen: 'Intel 13. Nesil' },
    { brand: 'Intel', model: 'Intel Core i9-13900K', socket: 'LGA1700', ramType: 'DDR4,DDR5', cores: 24, threads: 32, clock: '5.8', tdp: 253, gen: 'Intel 13. Nesil' },
    { brand: 'Intel', model: 'Intel Core i9-14900KF', socket: 'LGA1700', ramType: 'DDR4,DDR5', cores: 24, threads: 32, clock: '6.0', tdp: 253, gen: 'Intel 14. Nesil' },

    // Intel LGA1851 (DDR5)
    { brand: 'Intel', model: 'Intel Core Ultra 5 225F', socket: 'LGA1851', ramType: 'DDR5', cores: 10, threads: 10, clock: '4.9', tdp: 121, gen: 'Core Ultra 200' },
    { brand: 'Intel', model: 'Intel Core Ultra 5 245K', socket: 'LGA1851', ramType: 'DDR5', cores: 14, threads: 14, clock: '5.2', tdp: 159, gen: 'Core Ultra 200' },
    { brand: 'Intel', model: 'Intel Core Ultra 5 245KF', socket: 'LGA1851', ramType: 'DDR5', cores: 14, threads: 14, clock: '5.2', tdp: 159, gen: 'Core Ultra 200' },
    { brand: 'Intel', model: 'Intel Core Ultra 7 265K', socket: 'LGA1851', ramType: 'DDR5', cores: 20, threads: 20, clock: '5.5', tdp: 250, gen: 'Core Ultra 200' },
    { brand: 'Intel', model: 'Intel Core Ultra 7 265KF', socket: 'LGA1851', ramType: 'DDR5', cores: 20, threads: 20, clock: '5.5', tdp: 250, gen: 'Core Ultra 200' },
    { brand: 'Intel', model: 'Intel Core Ultra 9 285K', socket: 'LGA1851', ramType: 'DDR5', cores: 24, threads: 24, clock: '5.7', tdp: 250, gen: 'Core Ultra 200' },
  ];

  return blueprints.map((bp) => ({
    id: `cpu-gen-${slugify(bp.model)}`,
    category: 'cpu',
    brand: bp.brand,
    name: bp.model,
    specSummary: `${bp.cores} Çekirdek / ${bp.threads} İzlek · ${bp.clock} GHz · ${bp.socket} · ${bp.ramType.replace(',', '/')} · Maks. ${bp.tdp}W`,
    imageUrl: bp.brand === 'Intel' ? STUDIO_MEDIA_PATHS.cpuIntel : STUDIO_MEDIA_PATHS.cpuAmd,
    socket: bp.socket,
    ramType: bp.ramType,
    formFactor: null,
    tdp: bp.tdp,
    wattage: null,
    maxGpuLengthMm: null,
    isCatalogCore: true,
    sourceStore: 'RMG Garaj Katalog',
    externalUrl: null,
  }));
}

// ============================================================================
// 3. OTOMATİK EKRAN KARTI ÜRETİCİ (RTX 5060 / 5060 Ti / RX 9000 + Partner Kartlar)
// ============================================================================
function generateExtendedGpus(): SeedProductRecord[] {
  interface GpuChip {
    vendor: 'NVIDIA' | 'AMD' | 'Intel';
    chipName: string;
    vramGb: number;
    memType: string;
    tdp: number;
    recPsu: number;
    baseLength: number;
    partners: { brand: string; editions: { label: string; lengthAdd: number }[] }[];
  }

  const nvidiaStdPartners = [
    { brand: 'ASUS', editions: [{ label: 'DUAL OC', lengthAdd: 0 }, { label: 'TUF Gaming OC', lengthAdd: 35 }, { label: 'ROG Strix OC', lengthAdd: 50 }] },
    { brand: 'MSI', editions: [{ label: 'VENTUS 2X OC', lengthAdd: -8 }, { label: 'GAMING X SLIM', lengthAdd: 25 }, { label: 'GAMING TRIO OC', lengthAdd: 42 }] },
    { brand: 'Gigabyte', editions: [{ label: 'WINDFORCE OC', lengthAdd: 10 }, { label: 'GAMING OC', lengthAdd: 32 }, { label: 'AORUS ELITE', lengthAdd: 48 }] },
    { brand: 'Palit', editions: [{ label: 'Infinity 3', lengthAdd: 18 }, { label: 'JetStream OC', lengthAdd: 34 }] },
    { brand: 'Galax', editions: [{ label: '1-Click OC 2X', lengthAdd: -5 }, { label: 'EX Gamer 1-Click OC', lengthAdd: 30 }] },
    { brand: 'Zotac', editions: [{ label: 'Twin Edge OC', lengthAdd: -10 }, { label: 'AMP Extreme', lengthAdd: 38 }] },
    { brand: 'Gainward', editions: [{ label: 'Ghost OC', lengthAdd: -2 }, { label: 'Phoenix GS', lengthAdd: 34 }] },
    { brand: 'PNY', editions: [{ label: 'VERTO Dual', lengthAdd: -4 }, { label: 'XLR8 Epic-X RGB', lengthAdd: 36 }] },
    { brand: 'INNO3D', editions: [{ label: 'TWIN X2 OC', lengthAdd: -6 }, { label: 'iCHILL X3', lengthAdd: 38 }] },
  ];

  const amdPartners = [
    { brand: 'Sapphire', editions: [{ label: 'PULSE', lengthAdd: 0 }, { label: 'PURE Frost', lengthAdd: 22 }, { label: 'NITRO+ OC', lengthAdd: 36 }] },
    { brand: 'XFX', editions: [{ label: 'Speedster SWFT', lengthAdd: 12 }, { label: 'Speedster QICK', lengthAdd: 28 }, { label: 'Mercury Magnetic Air', lengthAdd: 40 }] },
    { brand: 'PowerColor', editions: [{ label: 'Fighter', lengthAdd: -5 }, { label: 'Hellhound OC', lengthAdd: 28 }, { label: 'Red Devil', lengthAdd: 42 }] },
    { brand: 'ASUS', editions: [{ label: 'PRIME OC', lengthAdd: 16 }, { label: 'TUF Gaming OC', lengthAdd: 35 }] },
    { brand: 'Gigabyte', editions: [{ label: 'GAMING OC', lengthAdd: 26 }, { label: 'AORUS ELITE', lengthAdd: 40 }] },
    { brand: 'ASRock', editions: [{ label: 'Challenger OC', lengthAdd: 8 }, { label: 'Steel Legend OC', lengthAdd: 30 }, { label: 'Phantom Gaming OC', lengthAdd: 38 }] },
  ];

  const chips: GpuChip[] = [
    // Yeni & Beklenen NVIDIA RTX 5000 Blackwell Serisi
    { vendor: 'NVIDIA', chipName: 'GeForce RTX 5050', vramGb: 8, memType: 'GDDR6', tdp: 130, recPsu: 500, baseLength: 228, partners: nvidiaStdPartners.slice(0, 6) },
    { vendor: 'NVIDIA', chipName: 'GeForce RTX 5060', vramGb: 8, memType: 'GDDR7', tdp: 145, recPsu: 550, baseLength: 242, partners: nvidiaStdPartners },
    { vendor: 'NVIDIA', chipName: 'GeForce RTX 5060 Ti', vramGb: 8, memType: 'GDDR7', tdp: 165, recPsu: 600, baseLength: 250, partners: nvidiaStdPartners },
    { vendor: 'NVIDIA', chipName: 'GeForce RTX 5060 Ti', vramGb: 16, memType: 'GDDR7', tdp: 170, recPsu: 600, baseLength: 258, partners: nvidiaStdPartners },
    { vendor: 'NVIDIA', chipName: 'GeForce RTX 5070', vramGb: 12, memType: 'GDDR7', tdp: 250, recPsu: 650, baseLength: 278, partners: nvidiaStdPartners },
    { vendor: 'NVIDIA', chipName: 'GeForce RTX 5070 Ti', vramGb: 16, memType: 'GDDR7', tdp: 300, recPsu: 750, baseLength: 304, partners: nvidiaStdPartners },
    { vendor: 'NVIDIA', chipName: 'GeForce RTX 5080', vramGb: 16, memType: 'GDDR7', tdp: 360, recPsu: 850, baseLength: 315, partners: nvidiaStdPartners },
    { vendor: 'NVIDIA', chipName: 'GeForce RTX 5090', vramGb: 32, memType: 'GDDR7', tdp: 575, recPsu: 1000, baseLength: 325, partners: nvidiaStdPartners.slice(0, 6) },

    // Yeni AMD Radeon RX 9000 RDNA 4 Serisi
    { vendor: 'AMD', chipName: 'Radeon RX 9060', vramGb: 8, memType: 'GDDR6', tdp: 140, recPsu: 550, baseLength: 236, partners: amdPartners },
    { vendor: 'AMD', chipName: 'Radeon RX 9060 XT', vramGb: 8, memType: 'GDDR6', tdp: 155, recPsu: 550, baseLength: 244, partners: amdPartners },
    { vendor: 'AMD', chipName: 'Radeon RX 9060 XT', vramGb: 16, memType: 'GDDR6', tdp: 165, recPsu: 550, baseLength: 252, partners: amdPartners },
    { vendor: 'AMD', chipName: 'Radeon RX 9070', vramGb: 16, memType: 'GDDR6', tdp: 220, recPsu: 650, baseLength: 282, partners: amdPartners },
    { vendor: 'AMD', chipName: 'Radeon RX 9070 XT', vramGb: 16, memType: 'GDDR6', tdp: 304, recPsu: 750, baseLength: 298, partners: amdPartners },

    // Popüler RTX 4000 & RX 7000 Partner Modelleri
    { vendor: 'NVIDIA', chipName: 'GeForce RTX 4060', vramGb: 8, memType: 'GDDR6', tdp: 115, recPsu: 550, baseLength: 235, partners: nvidiaStdPartners.slice(0, 6) },
    { vendor: 'NVIDIA', chipName: 'GeForce RTX 4060 Ti', vramGb: 16, memType: 'GDDR6', tdp: 165, recPsu: 550, baseLength: 252, partners: nvidiaStdPartners.slice(0, 5) },
    { vendor: 'NVIDIA', chipName: 'GeForce RTX 4070 SUPER', vramGb: 12, memType: 'GDDR6X', tdp: 220, recPsu: 650, baseLength: 274, partners: nvidiaStdPartners.slice(0, 6) },
    { vendor: 'NVIDIA', chipName: 'GeForce RTX 4070 Ti SUPER', vramGb: 16, memType: 'GDDR6X', tdp: 285, recPsu: 750, baseLength: 300, partners: nvidiaStdPartners.slice(0, 5) },
    { vendor: 'AMD', chipName: 'Radeon RX 7600 XT', vramGb: 16, memType: 'GDDR6', tdp: 190, recPsu: 600, baseLength: 258, partners: amdPartners.slice(0, 5) },
    { vendor: 'AMD', chipName: 'Radeon RX 7800 XT', vramGb: 16, memType: 'GDDR6', tdp: 263, recPsu: 700, baseLength: 286, partners: amdPartners.slice(0, 5) },
    { vendor: 'AMD', chipName: 'Radeon RX 7900 GRE', vramGb: 16, memType: 'GDDR6', tdp: 260, recPsu: 700, baseLength: 292, partners: amdPartners.slice(0, 5) },
    { vendor: 'AMD', chipName: 'Radeon RX 7900 XTX', vramGb: 24, memType: 'GDDR6', tdp: 355, recPsu: 850, baseLength: 312, partners: amdPartners.slice(0, 5) },

    // Intel Arc Battlemage
    {
      vendor: 'Intel',
      chipName: 'Arc B570',
      vramGb: 10,
      memType: 'GDDR6',
      tdp: 150,
      recPsu: 550,
      baseLength: 246,
      partners: [
        { brand: 'ASRock', editions: [{ label: 'Challenger OC', lengthAdd: 4 }, { label: 'Steel Legend OC', lengthAdd: 24 }] },
        { brand: 'Sparkle', editions: [{ label: 'Guardian OC', lengthAdd: 0 }, { label: 'TITAN OC', lengthAdd: 30 }] },
      ],
    },
    {
      vendor: 'Intel',
      chipName: 'Arc B580',
      vramGb: 12,
      memType: 'GDDR6',
      tdp: 190,
      recPsu: 600,
      baseLength: 255,
      partners: [
        { brand: 'ASRock', editions: [{ label: 'Challenger OC', lengthAdd: 8 }, { label: 'Steel Legend OC', lengthAdd: 28 }] },
        { brand: 'Sparkle', editions: [{ label: 'TITAN OC', lengthAdd: 32 }] },
      ],
    },
  ];

  const items: SeedProductRecord[] = [];
  for (const chip of chips) {
    const img =
      chip.vendor === 'AMD'
        ? STUDIO_MEDIA_PATHS.gpuAmd
        : chip.vendor === 'Intel'
          ? STUDIO_MEDIA_PATHS.gpuIntel
          : STUDIO_MEDIA_PATHS.gpuNvidia;

    for (const partner of chip.partners) {
      for (const edition of partner.editions) {
        const lengthMm = Math.max(210, Math.min(365, chip.baseLength + edition.lengthAdd));
        const fullName = `${partner.brand} ${chip.chipName} ${edition.label} ${chip.vramGb}GB`;
        items.push({
          id: `gpu-gen-${slugify(fullName)}`,
          category: 'gpu',
          brand: partner.brand,
          name: fullName,
          specSummary: `${chip.vramGb} GB ${chip.memType} · ${chip.tdp}W TDP · Önerilen ${chip.recPsu}W PSU · ${lengthMm} mm`,
          imageUrl: img,
          socket: null,
          ramType: null,
          formFactor: 'PCIe',
          tdp: chip.tdp,
          wattage: chip.recPsu,
          maxGpuLengthMm: lengthMm,
          isCatalogCore: true,
          sourceStore: 'RMG Garaj Katalog',
          externalUrl: null,
        });
      }
    }
  }
  return items;
}

// ============================================================================
// 4. OTOMATİK ANAKART ÜRETİCİ (A320 -> X870 & H410 -> Z890 x ASUS/MSI/Gigabyte/ASRock)
// ============================================================================
function generateExtendedMotherboards(): SeedProductRecord[] {
  interface ChipsetSpec {
    chipset: string;
    socket: 'AM4' | 'AM5' | 'LGA1200' | 'LGA1700' | 'LGA1851';
    ramTypes: ('DDR4' | 'DDR5')[];
    formFactors: ('ATX' | 'Micro-ATX' | 'Mini-ITX')[];
    tier: 'entry' | 'mid' | 'high';
  }

  const chipsets: ChipsetSpec[] = [
    // AMD AM4 (DDR4)
    { chipset: 'A320', socket: 'AM4', ramTypes: ['DDR4'], formFactors: ['Micro-ATX'], tier: 'entry' },
    { chipset: 'B450', socket: 'AM4', ramTypes: ['DDR4'], formFactors: ['Micro-ATX', 'ATX'], tier: 'entry' },
    { chipset: 'A520', socket: 'AM4', ramTypes: ['DDR4'], formFactors: ['Micro-ATX'], tier: 'entry' },
    { chipset: 'B550', socket: 'AM4', ramTypes: ['DDR4'], formFactors: ['Micro-ATX', 'ATX', 'Mini-ITX'], tier: 'mid' },
    { chipset: 'X570', socket: 'AM4', ramTypes: ['DDR4'], formFactors: ['ATX'], tier: 'high' },

    // AMD AM5 (DDR5)
    { chipset: 'A620', socket: 'AM5', ramTypes: ['DDR5'], formFactors: ['Micro-ATX', 'Mini-ITX'], tier: 'entry' },
    { chipset: 'B650', socket: 'AM5', ramTypes: ['DDR5'], formFactors: ['Micro-ATX', 'ATX', 'Mini-ITX'], tier: 'mid' },
    { chipset: 'B650E', socket: 'AM5', ramTypes: ['DDR5'], formFactors: ['ATX'], tier: 'high' },
    { chipset: 'B840', socket: 'AM5', ramTypes: ['DDR5'], formFactors: ['Micro-ATX'], tier: 'entry' },
    { chipset: 'B850', socket: 'AM5', ramTypes: ['DDR5'], formFactors: ['Micro-ATX', 'ATX'], tier: 'mid' },
    { chipset: 'X670', socket: 'AM5', ramTypes: ['DDR5'], formFactors: ['ATX'], tier: 'high' },
    { chipset: 'X670E', socket: 'AM5', ramTypes: ['DDR5'], formFactors: ['ATX'], tier: 'high' },
    { chipset: 'X870', socket: 'AM5', ramTypes: ['DDR5'], formFactors: ['ATX'], tier: 'high' },
    { chipset: 'X870E', socket: 'AM5', ramTypes: ['DDR5'], formFactors: ['ATX'], tier: 'high' },

    // Intel LGA1200 (DDR4)
    { chipset: 'H410', socket: 'LGA1200', ramTypes: ['DDR4'], formFactors: ['Micro-ATX'], tier: 'entry' },
    { chipset: 'B460', socket: 'LGA1200', ramTypes: ['DDR4'], formFactors: ['Micro-ATX', 'ATX'], tier: 'entry' },
    { chipset: 'H510', socket: 'LGA1200', ramTypes: ['DDR4'], formFactors: ['Micro-ATX'], tier: 'entry' },
    { chipset: 'B560', socket: 'LGA1200', ramTypes: ['DDR4'], formFactors: ['Micro-ATX', 'ATX'], tier: 'mid' },
    { chipset: 'Z490', socket: 'LGA1200', ramTypes: ['DDR4'], formFactors: ['ATX'], tier: 'high' },
    { chipset: 'Z590', socket: 'LGA1200', ramTypes: ['DDR4'], formFactors: ['ATX'], tier: 'high' },

    // Intel LGA1700 (DDR4 & DDR5)
    { chipset: 'H610', socket: 'LGA1700', ramTypes: ['DDR4', 'DDR5'], formFactors: ['Micro-ATX'], tier: 'entry' },
    { chipset: 'B660', socket: 'LGA1700', ramTypes: ['DDR4', 'DDR5'], formFactors: ['Micro-ATX', 'ATX'], tier: 'mid' },
    { chipset: 'B760', socket: 'LGA1700', ramTypes: ['DDR4', 'DDR5'], formFactors: ['Micro-ATX', 'ATX', 'Mini-ITX'], tier: 'mid' },
    { chipset: 'Z690', socket: 'LGA1700', ramTypes: ['DDR4', 'DDR5'], formFactors: ['ATX'], tier: 'high' },
    { chipset: 'Z790', socket: 'LGA1700', ramTypes: ['DDR4', 'DDR5'], formFactors: ['ATX'], tier: 'high' },

    // Intel LGA1851 (DDR5)
    { chipset: 'H810', socket: 'LGA1851', ramTypes: ['DDR5'], formFactors: ['Micro-ATX'], tier: 'entry' },
    { chipset: 'B860', socket: 'LGA1851', ramTypes: ['DDR5'], formFactors: ['Micro-ATX', 'ATX'], tier: 'mid' },
    { chipset: 'Z890', socket: 'LGA1851', ramTypes: ['DDR5'], formFactors: ['ATX', 'Micro-ATX', 'Mini-ITX'], tier: 'high' },
  ];

  const brandSeries: Record<
    'ASUS' | 'MSI' | 'Gigabyte' | 'ASRock',
    Record<'entry' | 'mid' | 'high', string[]>
  > = {
    ASUS: {
      entry: ['PRIME', 'PRIME K'],
      mid: ['PRIME PLUS', 'TUF GAMING PLUS WIFI'],
      high: ['TUF GAMING PRO WIFI', 'ROG STRIX GAMING WIFI'],
    },
    MSI: {
      entry: ['PRO M-A', 'PRO E'],
      mid: ['PRO GAMING WIFI', 'MAG MORTAR / TOMAHAWK WIFI'],
      high: ['MAG TOMAHAWK MAX WIFI', 'MPG CARBON WIFI'],
    },
    Gigabyte: {
      entry: ['DS3H', 'S2H'],
      mid: ['GAMING X AX', 'EAGLE AX'],
      high: ['AORUS ELITE AX', 'AORUS PRO ICE'],
    },
    ASRock: {
      entry: ['HDV/M.2', 'PRO RS'],
      mid: ['PG LIGHTNING', 'STEEL LEGEND WIFI'],
      high: ['PHANTOM GAMING RIPTIDE', 'TAICHI'],
    },
  };

  const items: SeedProductRecord[] = [];
  const brands = ['ASUS', 'MSI', 'Gigabyte', 'ASRock'] as const;

  for (const cs of chipsets) {
    for (const brand of brands) {
      const seriesList = brandSeries[brand][cs.tier];
      for (const formFactor of cs.formFactors) {
        const seriesNameRaw = seriesList[formFactor === 'ATX' && seriesList.length > 1 ? 1 : 0];
        const seriesName =
          brand === 'MSI' && seriesNameRaw.includes('/')
            ? formFactor === 'Micro-ATX'
              ? 'MAG MORTAR WIFI'
              : 'MAG TOMAHAWK WIFI'
            : formFactor === 'Mini-ITX'
              ? `${seriesNameRaw.split(' ')[0]} I-GAMING WIFI`
              : seriesNameRaw;

        for (const ramType of cs.ramTypes) {
          const ramSuffix = cs.ramTypes.length > 1 ? ` ${ramType}` : '';
          const formTag = formFactor === 'Micro-ATX' ? 'M' : formFactor === 'Mini-ITX' ? 'I' : '';
          const modelName = `${brand} ${seriesName} ${cs.chipset}${formTag}${ramSuffix}`.replace(/\s+/g, ' ').trim();
          const m2Count = cs.tier === 'high' ? 4 : cs.tier === 'mid' ? 2 : 1;
          const vrmWatts = cs.tier === 'high' ? 260 : cs.tier === 'mid' ? 180 : 105;

          items.push({
            id: `mb-gen-${slugify(modelName)}-${slugify(formFactor)}`,
            category: 'motherboard',
            brand,
            name: `${modelName} ${formFactor}`,
            specSummary: `${cs.socket} · ${cs.chipset} · ${ramType} · ${formFactor} · VRM ${vrmWatts}W · ${m2Count}x M.2`,
            imageUrl: STUDIO_MEDIA_PATHS.motherboard,
            socket: cs.socket,
            ramType,
            formFactor,
            tdp: 45,
            wattage: null,
            maxGpuLengthMm: null,
            isCatalogCore: true,
            sourceStore: 'RMG Garaj Katalog',
            externalUrl: null,
          });
        }
      }
    }
  }

  return items;
}

// ============================================================================
// 5. OTOMATİK RAM ÜRETİCİ (Corsair, G.Skill, Kingston, XPG, Lexar x DDR4/DDR5 x RGB x MHz/CL)
// ============================================================================
function generateExtendedRams(): SeedProductRecord[] {
  interface RamSeries {
    brand: 'Corsair' | 'G.Skill' | 'Kingston' | 'XPG' | 'Lexar';
    series: string;
    ddr: 'DDR4' | 'DDR5';
    rgb: boolean;
  }

  const seriesList: RamSeries[] = [
    // DDR4
    { brand: 'Corsair', series: 'Vengeance LPX', ddr: 'DDR4', rgb: false },
    { brand: 'Corsair', series: 'Vengeance RGB Pro', ddr: 'DDR4', rgb: true },
    { brand: 'G.Skill', series: 'Ripjaws V', ddr: 'DDR4', rgb: false },
    { brand: 'G.Skill', series: 'Trident Z RGB', ddr: 'DDR4', rgb: true },
    { brand: 'Kingston', series: 'FURY Beast', ddr: 'DDR4', rgb: false },
    { brand: 'Kingston', series: 'FURY Beast RGB', ddr: 'DDR4', rgb: true },
    { brand: 'XPG', series: 'Gammix D35', ddr: 'DDR4', rgb: false },
    { brand: 'XPG', series: 'Spectrix D35G RGB', ddr: 'DDR4', rgb: true },
    { brand: 'Lexar', series: 'Thor', ddr: 'DDR4', rgb: false },
    { brand: 'Lexar', series: 'Ares RGB', ddr: 'DDR4', rgb: true },

    // DDR5
    { brand: 'Corsair', series: 'Vengeance', ddr: 'DDR5', rgb: false },
    { brand: 'Corsair', series: 'Vengeance RGB', ddr: 'DDR5', rgb: true },
    { brand: 'Corsair', series: 'Dominator Titanium RGB', ddr: 'DDR5', rgb: true },
    { brand: 'G.Skill', series: 'Flare X5', ddr: 'DDR5', rgb: false },
    { brand: 'G.Skill', series: 'Trident Z5 Neo RGB', ddr: 'DDR5', rgb: true },
    { brand: 'Kingston', series: 'FURY Beast', ddr: 'DDR5', rgb: false },
    { brand: 'Kingston', series: 'FURY Beast RGB', ddr: 'DDR5', rgb: true },
    { brand: 'Kingston', series: 'FURY Renegade RGB', ddr: 'DDR5', rgb: true },
    { brand: 'XPG', series: 'Lancer Blade', ddr: 'DDR5', rgb: false },
    { brand: 'XPG', series: 'Lancer RGB', ddr: 'DDR5', rgb: true },
    { brand: 'Lexar', series: 'Thor OC', ddr: 'DDR5', rgb: false },
    { brand: 'Lexar', series: 'Ares RGB', ddr: 'DDR5', rgb: true },
  ];

  const ddr4Configs = [
    { cap: '16GB', kit: '1x16GB', mhz: 3200, cl: 'CL16' },
    { cap: '16GB', kit: '2x8GB', mhz: 3200, cl: 'CL16' },
    { cap: '16GB', kit: '2x8GB', mhz: 3600, cl: 'CL18' },
    { cap: '32GB', kit: '2x16GB', mhz: 3200, cl: 'CL16' },
    { cap: '32GB', kit: '2x16GB', mhz: 3600, cl: 'CL16' },
    { cap: '32GB', kit: '2x16GB', mhz: 4000, cl: 'CL18' },
    { cap: '64GB', kit: '2x32GB', mhz: 3600, cl: 'CL18' },
    { cap: '128GB', kit: '4x32GB', mhz: 3200, cl: 'CL16' },
  ];

  const ddr5Configs = [
    { cap: '16GB', kit: '1x16GB', mhz: 5600, cl: 'CL36' },
    { cap: '32GB', kit: '2x16GB', mhz: 5600, cl: 'CL36' },
    { cap: '32GB', kit: '2x16GB', mhz: 6000, cl: 'CL30' },
    { cap: '32GB', kit: '2x16GB', mhz: 6400, cl: 'CL32' },
    { cap: '32GB', kit: '2x16GB', mhz: 7200, cl: 'CL34' },
    { cap: '48GB', kit: '2x24GB', mhz: 6400, cl: 'CL32' },
    { cap: '48GB', kit: '2x24GB', mhz: 7200, cl: 'CL36' },
    { cap: '64GB', kit: '2x32GB', mhz: 6000, cl: 'CL30' },
    { cap: '64GB', kit: '2x32GB', mhz: 6400, cl: 'CL32' },
    { cap: '96GB', kit: '2x48GB', mhz: 6000, cl: 'CL30' },
  ];

  const items: SeedProductRecord[] = [];
  for (const s of seriesList) {
    const configs = s.ddr === 'DDR4' ? ddr4Configs : ddr5Configs;
    for (const cfg of configs) {
      const name = `${s.brand} ${s.series} ${cfg.cap} (${cfg.kit}) ${cfg.mhz}MHz ${cfg.cl} ${s.ddr}`;
      const rgbTag = s.rgb ? 'ARGB Aydınlatmalı' : 'Düşük Profil Soğutucu';
      items.push({
        id: `ram-gen-${slugify(name)}`,
        category: 'ram',
        brand: s.brand,
        name,
        specSummary: `${cfg.cap} (${cfg.kit}) · ${s.ddr} · ${cfg.mhz} MHz ${cfg.cl} · ${rgbTag}`,
        imageUrl: STUDIO_MEDIA_PATHS.ram,
        socket: null,
        ramType: s.ddr,
        formFactor: 'DIMM',
        tdp: s.ddr === 'DDR5' ? 12 : 10,
        wattage: null,
        maxGpuLengthMm: null,
        isCatalogCore: true,
        sourceStore: 'RMG Garaj Katalog',
        externalUrl: null,
      });
    }
  }
  return items;
}

// ============================================================================
// 6. OTOMATİK KASA ÜRETİCİ (ATX / Micro-ATX / Mini-ITX Varyasyonları)
// ============================================================================
function generateExtendedCases(): SeedProductRecord[] {
  const brands = [
    'Corsair',
    'NZXT',
    'Lian Li',
    'Cooler Master',
    'MSI',
    'ASUS',
    'DeepCool',
    'Thermaltake',
    'Fractal Design',
    'Phanteks',
  ];

  const chassisTemplates = [
    {
      suffix: 'Air Mini Mesh',
      supportedForms: 'Micro-ATX,Mini-ITX',
      sizeLabel: 'Micro-ATX',
      maxGpu: 345,
      fans: '3x 120mm Mesh',
      img: STUDIO_MEDIA_PATHS.caseCompact,
    },
    {
      suffix: 'Compact Cube ITX',
      supportedForms: 'Mini-ITX',
      sizeLabel: 'Mini-ITX',
      maxGpu: 315,
      fans: '2x 120mm',
      img: STUDIO_MEDIA_PATHS.caseCompact,
    },
    {
      suffix: '4000D Airflow TG',
      supportedForms: 'ATX,Micro-ATX,Mini-ITX',
      sizeLabel: 'ATX Mid-Tower',
      maxGpu: 380,
      fans: '4x 120mm ARGB',
      img: STUDIO_MEDIA_PATHS.caseAtX,
    },
    {
      suffix: 'Vision Akvaryum Panoramik',
      supportedForms: 'ATX,Micro-ATX,Mini-ITX',
      sizeLabel: 'ATX Akvaryum',
      maxGpu: 410,
      fans: '4x 120mm Reverse ARGB',
      img: STUDIO_MEDIA_PATHS.caseAtX,
    },
    {
      suffix: 'Pro Flow XL Full-Tower',
      supportedForms: 'ATX,Micro-ATX,Mini-ITX',
      sizeLabel: 'ATX / E-ATX Full-Tower',
      maxGpu: 435,
      fans: '4x 140mm PWM',
      img: STUDIO_MEDIA_PATHS.caseXl,
    },
  ];

  const colors = ['Siyah', 'Beyaz'];
  const items: SeedProductRecord[] = [];

  for (const brand of brands) {
    for (const tpl of chassisTemplates) {
      for (const color of colors) {
        const name = `${brand} ${tpl.suffix} ${color} Temperli Cam Kasa`;
        items.push({
          id: `case-gen-${slugify(`${brand}-${tpl.suffix}-${color}`)}`,
          category: 'pcCase',
          brand,
          name,
          specSummary: `${tpl.sizeLabel} · ${tpl.supportedForms.replace(/,/g, '/')} · Maks. ${tpl.maxGpu} mm GPU · ${tpl.fans}`,
          imageUrl: tpl.img,
          socket: null,
          ramType: null,
          formFactor: tpl.supportedForms,
          tdp: 0,
          wattage: null,
          maxGpuLengthMm: tpl.maxGpu,
          isCatalogCore: true,
          sourceStore: 'RMG Garaj Katalog',
          externalUrl: null,
        });
      }
    }
  }
  return items;
}

// ============================================================================
// 7. OTOMATİK GÜÇ KAYNAĞI (PSU), SSD VE SOĞUTUCU ÜRETİCİLERİ
// ============================================================================
function generateExtendedPsus(): SeedProductRecord[] {
  const brands = ['Corsair', 'MSI', 'ASUS', 'Seasonic', 'FSP', 'Cooler Master', 'be quiet!', 'Thermaltake', 'Gigabyte'];
  const tiers = [
    { watts: 550, eff: '80+ Bronze', atx: 'ATX 2.5', mod: 'Yarı Modüler', series: 'Bronze' },
    { watts: 650, eff: '80+ Bronze', atx: 'ATX 3.0', mod: 'Tam Modüler', series: 'Bronze Plus' },
    { watts: 750, eff: '80+ Gold', atx: 'ATX 3.0', mod: 'Tam Modüler', series: 'Gold' },
    { watts: 850, eff: '80+ Gold', atx: 'ATX 3.1 PCIe 5.1', mod: 'Tam Modüler', series: 'Gold ATX 3.1' },
    { watts: 1000, eff: '80+ Gold', atx: 'ATX 3.1 PCIe 5.1', mod: 'Tam Modüler', series: 'Pro 1000G' },
    { watts: 1200, eff: '80+ Platinum', atx: 'ATX 3.1 PCIe 5.1', mod: 'Tam Modüler', series: 'Platinum 1200P' },
  ];

  const items: SeedProductRecord[] = [];
  for (const brand of brands) {
    for (const tier of tiers) {
      const name = `${brand} ${tier.series} ${tier.watts}W ${tier.eff} ${tier.mod} PSU`;
      items.push({
        id: `psu-gen-${slugify(name)}`,
        category: 'psu',
        brand,
        name,
        specSummary: `${tier.watts}W · ${tier.eff} · ${tier.atx} · ${tier.mod}`,
        imageUrl: STUDIO_MEDIA_PATHS.psu,
        socket: null,
        ramType: null,
        formFactor: tier.atx,
        tdp: 0,
        wattage: tier.watts,
        maxGpuLengthMm: null,
        isCatalogCore: true,
        sourceStore: 'RMG Garaj Katalog',
        externalUrl: null,
      });
    }
  }
  return items;
}

function generateExtendedSsds(): SeedProductRecord[] {
  const brandModels: { brand: string; series: string; gen: 'PCIe 3.0' | 'PCIe 4.0' | 'PCIe 5.0'; speed: string }[] = [
    { brand: 'Samsung', series: '980', gen: 'PCIe 3.0', speed: '3500 MB/s' },
    { brand: 'Samsung', series: '990 PRO', gen: 'PCIe 4.0', speed: '7450 MB/s' },
    { brand: 'Samsung', series: '990 EVO Plus', gen: 'PCIe 5.0', speed: '7250 MB/s' },
    { brand: 'WD', series: 'Black SN770', gen: 'PCIe 4.0', speed: '5150 MB/s' },
    { brand: 'WD', series: 'Black SN850X', gen: 'PCIe 4.0', speed: '7300 MB/s' },
    { brand: 'Kingston', series: 'NV3', gen: 'PCIe 4.0', speed: '6000 MB/s' },
    { brand: 'Kingston', series: 'KC3000', gen: 'PCIe 4.0', speed: '7000 MB/s' },
    { brand: 'Crucial', series: 'P3 Plus', gen: 'PCIe 4.0', speed: '5000 MB/s' },
    { brand: 'Crucial', series: 'T705', gen: 'PCIe 5.0', speed: '14500 MB/s' },
    { brand: 'Lexar', series: 'NM790', gen: 'PCIe 4.0', speed: '7400 MB/s' },
    { brand: 'Corsair', series: 'MP600 PRO LPX', gen: 'PCIe 4.0', speed: '7100 MB/s' },
    { brand: 'Corsair', series: 'MP700 PRO', gen: 'PCIe 5.0', speed: '12400 MB/s' },
    { brand: 'Kioxia', series: 'Exceria PRO', gen: 'PCIe 4.0', speed: '7300 MB/s' },
    { brand: 'XPG', series: 'Gammix S70 Blade', gen: 'PCIe 4.0', speed: '7400 MB/s' },
  ];
  const capacities = ['500GB', '1TB', '2TB', '4TB'];

  const items: SeedProductRecord[] = [];
  for (const bm of brandModels) {
    for (const cap of capacities) {
      if (bm.gen === 'PCIe 5.0' && cap === '500GB') continue;
      if (bm.gen === 'PCIe 3.0' && cap === '4TB') continue;
      const name = `${bm.brand} ${bm.series} ${cap} ${bm.gen} NVMe M.2 SSD`;
      items.push({
        id: `ssd-gen-${slugify(name)}`,
        category: 'ssd',
        brand: bm.brand,
        name,
        specSummary: `${cap} · ${bm.gen} NVMe M.2 · ${bm.speed} Okuma`,
        imageUrl: STUDIO_MEDIA_PATHS.ssd,
        socket: null,
        ramType: null,
        formFactor: 'M.2',
        tdp: bm.gen === 'PCIe 5.0' ? 10 : 8,
        wattage: null,
        maxGpuLengthMm: null,
        isCatalogCore: true,
        sourceStore: 'RMG Garaj Katalog',
        externalUrl: null,
      });
    }
  }
  return items;
}

function generateExtendedCoolers(): SeedProductRecord[] {
  const brands = ['DeepCool', 'Thermalright', 'Arctic', 'Noctua', 'Corsair', 'MSI', 'NZXT', 'Cooler Master', 'be quiet!', 'Lian Li'];
  const models = [
    { label: 'Tek Kule 120mm Hava Soğutucu', type: 'Hava Soğutma', capacity: 210, tdp: 6, img: STUDIO_MEDIA_PATHS.coolerAir },
    { label: 'Çift Kule Dual-Fan Hava Soğutucu', type: 'Hava Soğutma', capacity: 270, tdp: 9, img: STUDIO_MEDIA_PATHS.coolerAir },
    { label: '240mm ARGB Sıvı Soğutma', type: 'Sıvı Soğutma', capacity: 290, tdp: 14, img: STUDIO_MEDIA_PATHS.coolerAio },
    { label: '360mm ARGB Sıvı Soğutma', type: 'Sıvı Soğutma', capacity: 350, tdp: 18, img: STUDIO_MEDIA_PATHS.coolerAio },
  ];
  const finishes = ['Siyah', 'Beyaz'];
  const allSockets = 'AM4,AM5,LGA1200,LGA1700,LGA1851';

  const items: SeedProductRecord[] = [];
  for (const brand of brands) {
    for (const m of models) {
      for (const finish of finishes) {
        if (brand === 'Noctua' && finish === 'Beyaz') continue;
        const name = `${brand} ${m.label} (${finish})`;
        items.push({
          id: `cooler-gen-${slugify(`${brand}-${m.label}-${finish}`)}`,
          category: 'cooler',
          brand,
          name,
          specSummary: `${m.type} · ${m.capacity}W TDP Kapasitesi · AM4/AM5/LGA1200/LGA1700/LGA1851`,
          imageUrl: m.img,
          socket: allSockets,
          ramType: null,
          formFactor: m.type,
          tdp: m.tdp,
          wattage: m.capacity,
          maxGpuLengthMm: null,
          isCatalogCore: true,
          sourceStore: 'RMG Garaj Katalog',
          externalUrl: null,
        });
      }
    }
  }
  return items;
}

export async function seedHardwareCatalog(): Promise<{
  total: number;
  byCategory: Record<string, number>;
}> {
  const rawCombined: SeedProductRecord[] = [
    ...buildStaticCoreRecords(),
    ...generateExtendedCpus(),
    ...generateExtendedGpus(),
    ...generateExtendedMotherboards(),
    ...generateExtendedRams(),
    ...generateExtendedCases(),
    ...generateExtendedPsus(),
    ...generateExtendedSsds(),
    ...generateExtendedCoolers(),
  ];

  // Tekil ID deduplikasyonu
  const uniqueMap = new Map<string, SeedProductRecord>();
  for (const item of rawCombined) {
    if (!uniqueMap.has(item.id)) {
      uniqueMap.set(item.id, item);
    }
  }

  const records = Array.from(uniqueMap.values());
  const now = new Date();
  const byCategory: Record<string, number> = {};
  const CHUNK_SIZE = 100;

  if (process.env.SQL_HOST) {
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      await db
        .insert(products)
        .values(
          chunk.map((item) => ({
            id: item.id,
            category: item.category,
            brand: item.brand,
            name: item.name,
            specSummary: item.specSummary,
            imageUrl: item.imageUrl,
            socket: item.socket,
            ramType: item.ramType,
            formFactor: item.formFactor,
            tdp: item.tdp,
            wattage: item.wattage,
            maxGpuLengthMm: item.maxGpuLengthMm,
            isCatalogCore: item.isCatalogCore,
            sourceStore: item.sourceStore,
            externalUrl: item.externalUrl,
            updatedAt: now,
          }))
        )
        .onConflictDoUpdate({
          target: products.id,
          set: {
            category: sql`excluded.category`,
            brand: sql`excluded.brand`,
            name: sql`excluded.name`,
            specSummary: sql`excluded.spec_summary`,
            imageUrl: sql`excluded.image_url`,
            socket: sql`excluded.socket`,
            ramType: sql`excluded.ram_type`,
            formFactor: sql`excluded.form_factor`,
            tdp: sql`excluded.tdp`,
            wattage: sql`excluded.wattage`,
            maxGpuLengthMm: sql`excluded.max_gpu_length_mm`,
            isCatalogCore: sql`excluded.is_catalog_core`,
            sourceStore: sql`excluded.source_store`,
            externalUrl: sql`excluded.external_url`,
            updatedAt: now,
          },
        });
    }
  }

  const prismaUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (prismaUrl) {
    const prisma = new PrismaClient({
      datasources: { db: { url: prismaUrl } },
    });
    try {
      const PRISMA_CHUNK_SIZE = 300;
      for (let i = 0; i < records.length; i += PRISMA_CHUNK_SIZE) {
        const chunk = records.slice(i, i + PRISMA_CHUNK_SIZE);
        await prisma.product.createMany({
          data: chunk.map((item) => ({
            id: item.id,
            category: item.category,
            brand: item.brand,
            modelName: item.name,
            specSummary: item.specSummary,
            imageUrl: item.imageUrl,
            socket: item.socket,
            ramType: item.ramType,
            formFactor: item.formFactor,
            tdp: item.tdp,
            wattage: item.wattage,
            maxGpuLengthMm: item.maxGpuLengthMm,
            isCatalogCore: item.isCatalogCore,
          })),
          skipDuplicates: true,
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  }

  for (const r of records) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
  }

  return { total: records.length, byCategory };
}

seedHardwareCatalog()
  .then(async (result) => {
    console.log(
      `[seed] Toplam ${result.total} donanım ürünü uyumluluk verileriyle veritabanına aktarıldı:`,
      result.byCategory
    );
    if (process.env.SQL_HOST) {
      await createPool().end();
    }
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('[seed] Donanım kataloğu aktarımı başarısız:', error);
    if (process.env.SQL_HOST) {
      await createPool().end().catch(() => {});
    }
    process.exit(1);
  });
