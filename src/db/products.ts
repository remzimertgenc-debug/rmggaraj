import { desc } from 'drizzle-orm';
import type { DynamicCatalogProduct, PartCategoryKey } from '../types/pc.ts';
import { db } from './index.ts';
import { products } from './schema.ts';

export interface UpsertDatabaseProductInput {
  id: string;
  category: PartCategoryKey;
  brand: string;
  name: string;
  specSummary?: string;
  imageUrl?: string | null;
  socket?: string | null;
  ramType?: string | null;
  formFactor?: string | null;
  tdp?: number | null;
  wattage?: number | null;
  maxGpuLengthMm?: number | null;
  isCatalogCore?: boolean;
  sourceStore?: string | null;
  externalUrl?: string | null;
}

const VALID_CATEGORIES = new Set<PartCategoryKey>([
  'cpu',
  'gpu',
  'motherboard',
  'ram',
  'ssd',
  'psu',
  'pcCase',
  'cooler',
]);

function normalizeCategory(raw: string): PartCategoryKey {
  if (VALID_CATEGORIES.has(raw as PartCategoryKey)) {
    return raw as PartCategoryKey;
  }
  return 'ram';
}

function mapProductRow(row: typeof products.$inferSelect): DynamicCatalogProduct {
  return {
    id: row.id,
    category: normalizeCategory(row.category),
    brand: row.brand,
    name: row.name,
    specSummary: row.specSummary,
    imageUrl: row.imageUrl ?? null,
    socket: row.socket ?? null,
    ramType: row.ramType ?? null,
    formFactor: row.formFactor ?? null,
    tdp: row.tdp ?? null,
    wattage: row.wattage ?? null,
    maxGpuLengthMm: row.maxGpuLengthMm ?? null,
    isCatalogCore: row.isCatalogCore,
    sourceStore: row.sourceStore ?? null,
    externalUrl: row.externalUrl ?? null,
  };
}

export async function getDatabaseProducts(): Promise<DynamicCatalogProduct[]> {
  try {
    const rows = await db
      .select()
      .from(products)
      .orderBy(desc(products.updatedAt), desc(products.createdAt));

    return rows.map(mapProductRow);
  } catch (error) {
    console.error('Database products query failed:', error);
    throw new Error('Ürün kataloğu veritabanından okunamadı.', { cause: error });
  }
}

export async function upsertDatabaseProduct(
  input: UpsertDatabaseProductInput
): Promise<DynamicCatalogProduct> {
  const now = new Date();
  const cleanImageUrl = input.imageUrl?.trim() || null;
  const cleanSpec = input.specSummary?.trim() || `${input.brand} · Otomatik Katalog Kaydı`;

  try {
    const [saved] = await db
      .insert(products)
      .values({
        id: input.id,
        category: input.category,
        brand: input.brand.trim() || 'Genel',
        name: input.name.trim(),
        specSummary: cleanSpec,
        imageUrl: cleanImageUrl,
        socket: input.socket ?? null,
        ramType: input.ramType ?? null,
        formFactor: input.formFactor ?? null,
        tdp: input.tdp ?? null,
        wattage: input.wattage ?? null,
        maxGpuLengthMm: input.maxGpuLengthMm ?? null,
        isCatalogCore: Boolean(input.isCatalogCore),
        sourceStore: input.sourceStore ?? null,
        externalUrl: input.externalUrl ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: products.id,
        set: {
          category: input.category,
          brand: input.brand.trim() || 'Genel',
          name: input.name.trim(),
          specSummary: cleanSpec,
          ...(cleanImageUrl ? { imageUrl: cleanImageUrl } : {}),
          ...(input.socket !== undefined ? { socket: input.socket } : {}),
          ...(input.ramType !== undefined ? { ramType: input.ramType } : {}),
          ...(input.formFactor !== undefined ? { formFactor: input.formFactor } : {}),
          ...(input.tdp !== undefined ? { tdp: input.tdp } : {}),
          ...(input.wattage !== undefined ? { wattage: input.wattage } : {}),
          ...(input.maxGpuLengthMm !== undefined
            ? { maxGpuLengthMm: input.maxGpuLengthMm }
            : {}),
          ...(input.isCatalogCore !== undefined
            ? { isCatalogCore: input.isCatalogCore }
            : {}),
          sourceStore: input.sourceStore ?? null,
          externalUrl: input.externalUrl ?? null,
          updatedAt: now,
        },
      })
      .returning();

    return mapProductRow(saved);
  } catch (error) {
    console.error('Database upsert product failed:', error);
    throw new Error('Yeni ürün kaydı veritabanına yazılamadı.', { cause: error });
  }
}
