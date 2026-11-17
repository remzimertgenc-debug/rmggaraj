import { desc } from 'drizzle-orm';
import type { DynamicCatalogProduct, PartCategoryKey } from '../types/pc.ts';
import { db, handleDatabaseQueryFailure, isDatabaseConfigured } from './index.ts';
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

const memoryProducts = new Map<string, DynamicCatalogProduct>();

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

function upsertMemoryProduct(input: UpsertDatabaseProductInput): DynamicCatalogProduct {
  const existing = memoryProducts.get(input.id);
  const cleanImageUrl = input.imageUrl?.trim() || existing?.imageUrl || null;
  const cleanSpec =
    input.specSummary?.trim() ||
    existing?.specSummary ||
    `${input.brand} · Otomatik Katalog Kaydı`;

  const saved: DynamicCatalogProduct = {
    id: input.id,
    category: input.category,
    brand: input.brand.trim() || 'Genel',
    name: input.name.trim(),
    specSummary: cleanSpec,
    imageUrl: cleanImageUrl,
    socket: input.socket !== undefined ? input.socket : (existing?.socket ?? null),
    ramType: input.ramType !== undefined ? input.ramType : (existing?.ramType ?? null),
    formFactor:
      input.formFactor !== undefined ? input.formFactor : (existing?.formFactor ?? null),
    tdp: input.tdp !== undefined ? input.tdp : (existing?.tdp ?? null),
    wattage: input.wattage !== undefined ? input.wattage : (existing?.wattage ?? null),
    maxGpuLengthMm:
      input.maxGpuLengthMm !== undefined
        ? input.maxGpuLengthMm
        : (existing?.maxGpuLengthMm ?? null),
    isCatalogCore:
      input.isCatalogCore !== undefined
        ? Boolean(input.isCatalogCore)
        : (existing?.isCatalogCore ?? false),
    sourceStore: input.sourceStore ?? null,
    externalUrl: input.externalUrl ?? null,
  };
  memoryProducts.set(saved.id, saved);
  return saved;
}

export async function getDatabaseProducts(): Promise<DynamicCatalogProduct[]> {
  if (!isDatabaseConfigured) {
    return Array.from(memoryProducts.values()).reverse();
  }

  try {
    const rows = await db
      .select()
      .from(products)
      .orderBy(desc(products.updatedAt), desc(products.createdAt));

    return rows.map(mapProductRow);
  } catch (error) {
    handleDatabaseQueryFailure('products.getDatabaseProducts', error);
    return Array.from(memoryProducts.values()).reverse();
  }
}

export async function upsertDatabaseProduct(
  input: UpsertDatabaseProductInput
): Promise<DynamicCatalogProduct> {
  if (!isDatabaseConfigured) {
    return upsertMemoryProduct(input);
  }

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
    handleDatabaseQueryFailure('products.upsertDatabaseProduct', error);
    return upsertMemoryProduct(input);
  }
}
