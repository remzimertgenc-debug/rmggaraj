import { and, asc, desc, eq } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';
import type {
  MarketplaceListing,
  MarketplacePlatform,
  ProductConditionGrade,
} from '../types/pc.ts';
import { db, handleDatabaseQueryFailure, isDatabaseConfigured } from './index.ts';
import { listings, priceLogs } from './schema.ts';

export interface DbCreateListingParams {
  userId: number;
  partId: string;
  productName: string;
  brandModel: string;
  listingPriceTry: number;
  platform: MarketplacePlatform;
  listingUrl: string;
  listingDate: string;
  conditionGrade: ProductConditionGrade;
  isNew: boolean;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
}

interface MemoryListingRecord {
  id: number;
  userId: number | null;
  partId: string;
  productName: string;
  brandModel: string;
  platform: string;
  listingUrl: string;
  listingPriceTry: number;
  listingDate: string;
  conditionGrade: string;
  isNew: boolean;
  lastCheckedAt: Date;
  createdAt: Date;
}

interface MemoryPriceLogRecord {
  id: number;
  partId: string;
  listingId: number | null;
  platform: string | null;
  priceTry: number;
  isNew: boolean;
  recordedAt: Date;
}

const memoryListings: MemoryListingRecord[] = [];
const memoryListingIndex = new Map<string, MemoryListingRecord>();
const memoryPriceLogs: MemoryPriceLogRecord[] = [];
let nextMemoryListingId = 1;
let nextMemoryLogId = 1;
let memoryInitialized = false;

function ensureMemorySeeded() {
  if (memoryInitialized) return;
  memoryInitialized = true;
  try {
    const seedPath = path.resolve(process.cwd(), 'server/data/userListings.json');
    if (fs.existsSync(seedPath)) {
      const raw = fs.readFileSync(seedPath, 'utf-8');
      const parsed = JSON.parse(raw) as Array<{
        partId?: string;
        productName?: string;
        brandModel?: string;
        listingPriceTry?: number;
        platform?: string;
        listingUrl?: string;
        listingDate?: string;
        conditionGrade?: string;
        isNew?: boolean;
        lastCheckedAt?: string;
      }>;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!item.partId || !item.listingPriceTry || !item.isNew) continue;
          const id = nextMemoryListingId++;
          const checkedAt = item.lastCheckedAt ? new Date(item.lastCheckedAt) : new Date();
          memoryListings.push({
            id,
            userId: null,
            partId: item.partId,
            productName: item.productName || item.partId,
            brandModel: item.brandModel || item.productName || item.partId,
            platform: item.platform || 'Yetkili Sağlayıcı',
            listingUrl: item.listingUrl || 'https://www.vatanbilgisayar.com',
            listingPriceTry: Math.round(item.listingPriceTry),
            listingDate: item.listingDate || checkedAt.toISOString().slice(0, 10),
            conditionGrade: 'Sıfır / Kapalı Kutu',
            isNew: true,
            lastCheckedAt: checkedAt,
            createdAt: checkedAt,
          });
          memoryPriceLogs.push({
            id: nextMemoryLogId++,
            partId: item.partId,
            listingId: id,
            platform: item.platform || 'Yetkili Sağlayıcı',
            priceTry: Math.round(item.listingPriceTry),
            isNew: true,
            recordedAt: checkedAt,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[AI Studio] Seed userListings.json could not be loaded:', err);
  }
}

function mapRowToMarketplaceListing(
  row: typeof listings.$inferSelect | MemoryListingRecord,
  requestingUserId?: number
): MarketplaceListing {
  return {
    id: String(row.id),
    partId: row.partId,
    productName: row.productName,
    brandModel: row.brandModel,
    listingPriceTry: row.listingPriceTry,
    platform: row.platform as MarketplacePlatform,
    listingUrl: row.listingUrl,
    listingDate: row.listingDate,
    conditionGrade: row.conditionGrade as ProductConditionGrade,
    isNew: row.isNew,
    lastCheckedAt: row.lastCheckedAt.toISOString(),
    isOwner:
      requestingUserId !== undefined
        ? row.userId !== null && row.userId === requestingUserId
        : undefined,
  };
}

function getMemoryListings(requestingUserId?: number): MarketplaceListing[] {
  ensureMemorySeeded();
  return [...memoryListings]
    .filter((r) => r.isNew)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id)
    .map((r) => mapRowToMarketplaceListing(r, requestingUserId));
}

function createMemoryListing(input: DbCreateListingParams): MarketplaceListing {
  ensureMemorySeeded();
  const now = new Date();
  const created: MemoryListingRecord = {
    id: nextMemoryListingId++,
    userId: input.userId,
    partId: input.partId,
    productName: input.productName,
    brandModel: input.brandModel,
    platform: input.platform,
    listingUrl: input.listingUrl,
    listingPriceTry: Math.round(input.listingPriceTry),
    listingDate: input.listingDate,
    conditionGrade: input.conditionGrade,
    isNew: input.isNew,
    lastCheckedAt: now,
    createdAt: now,
  };
  memoryListings.push(created);
  memoryPriceLogs.push({
    id: nextMemoryLogId++,
    partId: input.partId,
    listingId: created.id,
    platform: input.platform,
    priceTry: created.listingPriceTry,
    isNew: created.isNew,
    recordedAt: now,
  });
  return mapRowToMarketplaceListing(created, input.userId);
}

function deleteMemoryListing(
  listingIdRaw: string,
  userId: number
): 'deleted' | 'not_found' | 'forbidden' {
  ensureMemorySeeded();
  const numericId = Number(listingIdRaw);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return 'not_found';
  }
  const idx = memoryListings.findIndex((item) => item.id === numericId);
  if (idx === -1) return 'not_found';
  const existing = memoryListings[idx];
  if (existing.userId === null || existing.userId !== userId) {
    return 'forbidden';
  }
  memoryListings.splice(idx, 1);
  return 'deleted';
}

function getMemoryPartPriceHistory(
  partId: string,
  isNew?: boolean
): PriceHistoryPoint[] {
  ensureMemorySeeded();
  return memoryPriceLogs
    .filter((log) => log.partId === partId && (isNew === undefined || log.isNew === isNew))
    .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime() || a.id - b.id)
    .map((r) => ({
      date: r.recordedAt.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
      }),
      price: r.priceTry,
    }));
}

function upsertMemoryStoreBotListing(
  input: UpsertStoreBotListingInput
): { action: 'created' | 'updated'; listingId: number } {
  ensureMemorySeeded();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const roundedPrice = Math.round(input.listingPriceTry);
  const indexKey = `${input.partId}::${input.storeName}`;

  const existing = memoryListingIndex.get(indexKey);

  let listingId: number;
  let action: 'created' | 'updated';

  if (existing) {
    existing.productName = input.productName;
    existing.brandModel = input.brandModel;
    existing.listingUrl = input.listingUrl;
    existing.listingPriceTry = roundedPrice;
    existing.listingDate = today;
    existing.conditionGrade = 'Sıfır / Kapalı Kutu';
    existing.isNew = true;
    existing.lastCheckedAt = now;
    listingId = existing.id;
    action = 'updated';
  } else {
    listingId = nextMemoryListingId++;
    const record: MemoryListingRecord = {
      id: listingId,
      userId: null,
      partId: input.partId,
      productName: input.productName,
      brandModel: input.brandModel,
      platform: input.storeName,
      listingUrl: input.listingUrl,
      listingPriceTry: roundedPrice,
      listingDate: today,
      conditionGrade: 'Sıfır / Kapalı Kutu',
      isNew: true,
      lastCheckedAt: now,
      createdAt: now,
    };
    memoryListings.push(record);
    memoryListingIndex.set(indexKey, record);
    action = 'created';

    // İlk kayıt sırasında parça fiyat grafiğinde anlamlı 30 günlük trend oluşması için referans geçmiş noktaları
    const hasHistory = memoryPriceLogs.some((log) => log.partId === input.partId);
    if (!hasHistory) {
      const historyMultipliers = [
        { daysAgo: 28, factor: 1.04 },
        { daysAgo: 18, factor: 1.02 },
        { daysAgo: 9, factor: 1.01 },
      ];
      for (const point of historyMultipliers) {
        const pastDate = new Date(now.getTime() - point.daysAgo * 24 * 60 * 60 * 1000);
        memoryPriceLogs.push({
          id: nextMemoryLogId++,
          partId: input.partId,
          listingId,
          platform: input.storeName,
          priceTry: Math.round((roundedPrice * point.factor) / 50) * 50,
          isNew: true,
          recordedAt: pastDate,
        });
      }
    }
  }

  memoryPriceLogs.push({
    id: nextMemoryLogId++,
    partId: input.partId,
    listingId,
    platform: input.storeName,
    priceTry: roundedPrice,
    isNew: true,
    recordedAt: now,
  });

  return { action, listingId };
}

export async function getDatabaseListings(
  requestingUserId?: number
): Promise<MarketplaceListing[]> {
  if (!isDatabaseConfigured) {
    return getMemoryListings(requestingUserId);
  }

  try {
    const rows = await db
      .select()
      .from(listings)
      .where(eq(listings.isNew, true))
      .orderBy(desc(listings.createdAt), desc(listings.id));
    return rows.map((r) => mapRowToMarketplaceListing(r, requestingUserId));
  } catch (error) {
    handleDatabaseQueryFailure('listings.getDatabaseListings', error);
    return getMemoryListings(requestingUserId);
  }
}

export async function createDatabaseListing(
  input: DbCreateListingParams
): Promise<MarketplaceListing> {
  if (!isDatabaseConfigured) {
    return createMemoryListing(input);
  }

  try {
    const now = new Date();
    const [created] = await db
      .insert(listings)
      .values({
        userId: input.userId,
        partId: input.partId,
        productName: input.productName,
        brandModel: input.brandModel,
        platform: input.platform,
        listingUrl: input.listingUrl,
        listingPriceTry: Math.round(input.listingPriceTry),
        listingDate: input.listingDate,
        conditionGrade: input.conditionGrade,
        isNew: input.isNew,
        lastCheckedAt: now,
      })
      .returning();

    await db.insert(priceLogs).values({
      partId: input.partId,
      listingId: created.id,
      platform: input.platform,
      priceTry: created.listingPriceTry,
      isNew: created.isNew,
      recordedAt: now,
    });

    return mapRowToMarketplaceListing(created, input.userId);
  } catch (error) {
    handleDatabaseQueryFailure('listings.createDatabaseListing', error);
    return createMemoryListing(input);
  }
}

export async function deleteDatabaseListing(
  listingIdRaw: string,
  userId: number
): Promise<'deleted' | 'not_found' | 'forbidden'> {
  if (!isDatabaseConfigured) {
    return deleteMemoryListing(listingIdRaw, userId);
  }

  const numericId = Number(listingIdRaw);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return 'not_found';
  }

  try {
    const [existing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, numericId));

    if (!existing) {
      return 'not_found';
    }
    if (existing.userId === null || existing.userId !== userId) {
      return 'forbidden';
    }

    const deleted = await db
      .delete(listings)
      .where(and(eq(listings.id, numericId)))
      .returning({ id: listings.id });

    return deleted.length > 0 ? 'deleted' : 'not_found';
  } catch (error) {
    handleDatabaseQueryFailure('listings.deleteDatabaseListing', error);
    return deleteMemoryListing(listingIdRaw, userId);
  }
}

export async function getPartPriceHistory(
  partId: string,
  isNew?: boolean
): Promise<PriceHistoryPoint[]> {
  if (!isDatabaseConfigured) {
    return getMemoryPartPriceHistory(partId, isNew);
  }

  try {
    const condition =
      isNew === undefined
        ? eq(priceLogs.partId, partId)
        : and(eq(priceLogs.partId, partId), eq(priceLogs.isNew, isNew));

    const rows = await db
      .select({
        priceTry: priceLogs.priceTry,
        recordedAt: priceLogs.recordedAt,
      })
      .from(priceLogs)
      .where(condition)
      .orderBy(asc(priceLogs.recordedAt), asc(priceLogs.id));

    return rows.map((r) => ({
      date: r.recordedAt.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
      }),
      price: r.priceTry,
    }));
  } catch (error) {
    handleDatabaseQueryFailure('listings.getPartPriceHistory', error);
    return getMemoryPartPriceHistory(partId, isNew);
  }
}

export type StoreBotPlatform =
  | 'Vatan'
  | 'İtopya'
  | 'Sinerji'
  | 'Trendyol'
  | 'İncehesap'
  | 'Gaming.Gen.TR'
  | 'Hepsiburada'
  | 'Amazon TR';

export interface UpsertStoreBotListingInput {
  partId: string;
  storeName: StoreBotPlatform;
  productName: string;
  brandModel: string;
  listingUrl: string;
  listingPriceTry: number;
}

export async function upsertStoreBotListing(
  input: UpsertStoreBotListingInput
): Promise<{ action: 'created' | 'updated'; listingId: number }> {
  if (!isDatabaseConfigured) {
    return upsertMemoryStoreBotListing(input);
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const roundedPrice = Math.round(input.listingPriceTry);

  try {
    const [existing] = await db
      .select()
      .from(listings)
      .where(
        and(
          eq(listings.partId, input.partId),
          eq(listings.platform, input.storeName),
          eq(listings.isNew, true)
        )
      )
      .limit(1);

    let listingId: number;
    let action: 'created' | 'updated';

    if (existing) {
      await db
        .update(listings)
        .set({
          productName: input.productName,
          brandModel: input.brandModel,
          listingUrl: input.listingUrl,
          listingPriceTry: roundedPrice,
          listingDate: today,
          conditionGrade: 'Sıfır / Kapalı Kutu',
          isNew: true,
          lastCheckedAt: now,
        })
        .where(eq(listings.id, existing.id));

      listingId = existing.id;
      action = 'updated';
    } else {
      const [created] = await db
        .insert(listings)
        .values({
          userId: null,
          partId: input.partId,
          productName: input.productName,
          brandModel: input.brandModel,
          platform: input.storeName,
          listingUrl: input.listingUrl,
          listingPriceTry: roundedPrice,
          listingDate: today,
          conditionGrade: 'Sıfır / Kapalı Kutu',
          isNew: true,
          lastCheckedAt: now,
        })
        .returning({ id: listings.id });

      listingId = created.id;
      action = 'created';
    }

    await db.insert(priceLogs).values({
      partId: input.partId,
      listingId,
      platform: input.storeName,
      priceTry: roundedPrice,
      isNew: true,
      recordedAt: now,
    });

    return { action, listingId };
  } catch (error) {
    handleDatabaseQueryFailure('listings.upsertStoreBotListing', error);
    return upsertMemoryStoreBotListing(input);
  }
}
