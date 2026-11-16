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
import { getPartImage } from '../src/data/partMedia.ts';
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

// ============================================================================
// MERKEZİ TÜRKİYE PAZARI SIFIR DONANIM KATALOĞU (shared/hardwareCatalog.ts)
// ============================================================================
function buildStaticCoreRecords(): SeedProductRecord[] {
  const records: SeedProductRecord[] = [];

  for (const cpu of CPU_DB.filter((p) => !p.isUnverifiedSpecSample)) {
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

  for (const gpu of GPU_DB.filter((p) => !p.isUnverifiedSpecSample)) {
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

  for (const mb of MOTHERBOARD_DB.filter((p) => !p.isUnverifiedSpecSample)) {
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

  for (const ram of RAM_DB.filter((p) => !p.isUnverifiedSpecSample)) {
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

  for (const ssd of SSD_DB.filter((p) => !p.isUnverifiedSpecSample)) {
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

  for (const psu of PSU_DB.filter((p) => !p.isUnverifiedSpecSample)) {
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

  for (const pcCase of CASE_DB.filter((p) => !p.isUnverifiedSpecSample)) {
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

  for (const cooler of CPU_COOLER_DB.filter((p) => !p.isUnverifiedSpecSample)) {
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

export async function seedHardwareCatalog(): Promise<{
  total: number;
  byCategory: Record<string, number>;
}> {
  const uniqueMap = new Map<string, SeedProductRecord>();
  for (const item of buildStaticCoreRecords()) {
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
      `[seed] Toplam ${result.total} sıfır donanım ürünü uyumluluk verileriyle veritabanına aktarıldı:`,
      result.byCategory
    );
    if (process.env.SQL_HOST) {
      await createPool()?.end();
    }
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('[seed] Donanım kataloğu aktarımı başarısız:', error);
    if (process.env.SQL_HOST) {
      await createPool()?.end().catch(() => {});
    }
    process.exit(1);
  });
