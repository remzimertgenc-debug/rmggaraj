import { and, asc, desc, eq, inArray, notInArray } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';
import type {
  DataOrigin,
  MarketplaceListing,
  MarketplacePlatform,
  ProductConditionGrade,
} from '../types/pc.ts';
import { db, handleDatabaseQueryFailure, isDatabaseConfigured } from './index.ts';
import { listings, priceLogs } from './schema.ts';

export const VALID_DATA_ORIGINS: readonly DataOrigin[] = [
  'store_feed',
  'authorized_api',
  'user_submitted',
  'synthetic_fallback',
  'synthetic_backfill',
  'legacy_unknown',
] as const;

const VALID_DATA_ORIGIN_SET = new Set<DataOrigin>(VALID_DATA_ORIGINS);

const SYNTHETIC_BOT_URL_PREFIXES = [
  'https://www.vatanbilgisayar.com/arama/',
  'https://www.itopya.com/arama?q=',
  'https://www.sinerji.gen.tr/arama?q=',
  'https://www.trendyol.com/sr?q=',
  'https://www.incehesap.com/q/',
  'https://www.gaming.gen.tr/?s=',
  'https://www.hepsiburada.com/ara?q=',
  'https://www.amazon.com.tr/s?k=',
];

export function isSyntheticFallbackAllowed(): boolean {
  return process.env.ALLOW_SYNTHETIC_FALLBACK?.trim().toLowerCase() === 'true';
}

export function normalizeDataOrigin(raw: string | null | undefined): DataOrigin {
  if (raw && VALID_DATA_ORIGIN_SET.has(raw as DataOrigin)) {
    return raw as DataOrigin;
  }
  return 'legacy_unknown';
}

export function isSyntheticOrigin(origin: DataOrigin): boolean {
  return origin === 'synthetic_fallback' || origin === 'synthetic_backfill';
}

function matchesSyntheticBotSearchUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith('https://www.gaming.gen.tr/?s=')) {
    return trimmed.includes('&post_type=product');
  }
  return SYNTHETIC_BOT_URL_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

function classifyLegacyListingProvenance(row: {
  userId: number | null;
  listingUrl: string;
}): { isSimulated: boolean; dataOrigin: DataOrigin } {
  if (row.userId !== null) {
    return { isSimulated: false, dataOrigin: 'user_submitted' };
  }
  if (matchesSyntheticBotSearchUrl(row.listingUrl)) {
    return { isSimulated: true, dataOrigin: 'synthetic_fallback' };
  }
  return { isSimulated: false, dataOrigin: 'legacy_unknown' };
}

function isUndefinedColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if ((error as { code?: unknown }).code === '42703') return true;
  const cause = (error as { cause?: unknown }).cause;
  return Boolean(
    cause &&
      typeof cause === 'object' &&
      (cause as { code?: unknown }).code === '42703'
  );
}

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
  isSimulated: boolean;
  dataOrigin: DataOrigin;
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
  isSimulated: boolean;
  dataOrigin: DataOrigin;
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
        isSimulated?: boolean;
        dataOrigin?: string;
        lastCheckedAt?: string;
      }>;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!item.partId || !item.listingPriceTry || !item.isNew) continue;
          const id = nextMemoryListingId++;
          const checkedAt = item.lastCheckedAt ? new Date(item.lastCheckedAt) : new Date();
          const dataOrigin = normalizeDataOrigin(item.dataOrigin);
          const isSimulated = Boolean(item.isSimulated) || isSyntheticOrigin(dataOrigin);
          memoryListings.push({
            id,
            userId: null,
            partId: item.partId,
            productName: item.productName || item.partId,
            brandModel: item.brandModel || item.productName || item.partId,
            platform: item.platform || 'Yetkili Sağlayıcı',
            listingUrl: item.listingUrl || '',
            listingPriceTry: Math.round(item.listingPriceTry),
            listingDate: item.listingDate || checkedAt.toISOString().slice(0, 10),
            conditionGrade: 'Sıfır / Kapalı Kutu',
            isNew: true,
            isSimulated,
            dataOrigin,
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
            isSimulated,
            dataOrigin,
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
  row: {
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
    isSimulated?: boolean;
    dataOrigin?: string | null;
    lastCheckedAt: Date;
  },
  requestingUserId?: number
): MarketplaceListing {
  const dataOrigin = normalizeDataOrigin(row.dataOrigin);
  const isSimulated = Boolean(row.isSimulated) || isSyntheticOrigin(dataOrigin);

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
    isSimulated,
    dataOrigin,
    isOwner:
      requestingUserId !== undefined
        ? row.userId !== null && row.userId === requestingUserId
        : undefined,
  };
}

function getMemoryListings(
  requestingUserId?: number,
  includeSimulated = false
): MarketplaceListing[] {
  ensureMemorySeeded();
  return [...memoryListings]
    .filter(
      (r) =>
        r.isNew &&
        (includeSimulated || (!r.isSimulated && !isSyntheticOrigin(r.dataOrigin)))
    )
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
    isSimulated: false,
    dataOrigin: 'user_submitted',
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
    isSimulated: false,
    dataOrigin: 'user_submitted',
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
  isNew?: boolean,
  includeSimulated = false
): PriceHistoryPoint[] {
  ensureMemorySeeded();
  return memoryPriceLogs
    .filter(
      (log) =>
        log.partId === partId &&
        (isNew === undefined || log.isNew === isNew) &&
        (includeSimulated ||
          (!log.isSimulated && !isSyntheticOrigin(log.dataOrigin)))
    )
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
): { action: 'created' | 'updated' | 'skipped'; listingId: number } {
  ensureMemorySeeded();
  const dataOrigin = normalizeDataOrigin(
    input.dataOrigin ?? (input.isSimulated ? 'synthetic_fallback' : 'store_feed')
  );
  const isSimulated = Boolean(input.isSimulated) || isSyntheticOrigin(dataOrigin);

  if (isSimulated && !isSyntheticFallbackAllowed()) {
    return { action: 'skipped', listingId: 0 };
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const roundedPrice = Math.round(input.listingPriceTry);
  const indexKey = `${input.partId}::${input.storeName}`;

  const existing = memoryListingIndex.get(indexKey);

  let listingId: number;
  let action: 'created' | 'updated';

  if (existing) {
    if (!existing.isSimulated && isSimulated) {
      return { action: 'skipped', listingId: existing.id };
    }
    existing.productName = input.productName;
    existing.brandModel = input.brandModel;
    existing.listingUrl = input.listingUrl;
    existing.listingPriceTry = roundedPrice;
    existing.listingDate = today;
    existing.conditionGrade = 'Sıfır / Kapalı Kutu';
    existing.isNew = true;
    existing.isSimulated = isSimulated;
    existing.dataOrigin = dataOrigin;
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
      isSimulated,
      dataOrigin,
      lastCheckedAt: now,
      createdAt: now,
    };
    memoryListings.push(record);
    memoryListingIndex.set(indexKey, record);
    action = 'created';
  }

  memoryPriceLogs.push({
    id: nextMemoryLogId++,
    partId: input.partId,
    listingId,
    platform: input.storeName,
    priceTry: roundedPrice,
    isNew: true,
    isSimulated,
    dataOrigin,
    recordedAt: now,
  });

  return { action, listingId };
}

export async function getDatabaseListings(
  requestingUserId?: number,
  options?: { includeSimulated?: boolean }
): Promise<MarketplaceListing[]> {
  const includeSimulated = options?.includeSimulated ?? false;

  if (!isDatabaseConfigured) {
    return getMemoryListings(requestingUserId, includeSimulated);
  }

  try {
    const condition = includeSimulated
      ? eq(listings.isNew, true)
      : and(
          eq(listings.isNew, true),
          eq(listings.isSimulated, false),
          notInArray(listings.dataOrigin, ['synthetic_fallback', 'synthetic_backfill'])
        );

    const rows = await db
      .select()
      .from(listings)
      .where(condition)
      .orderBy(desc(listings.createdAt), desc(listings.id));
    return rows.map((r) => mapRowToMarketplaceListing(r, requestingUserId));
  } catch (error) {
    if (isUndefinedColumnError(error)) {
      console.warn(
        '[DB Migration Pending] listings tablosunda is_simulated/data_origin sütunları henüz yok; uyumlu sorgu modu kullanılıyor.'
      );
      const legacyRows = await db
        .select({
          id: listings.id,
          userId: listings.userId,
          partId: listings.partId,
          productName: listings.productName,
          brandModel: listings.brandModel,
          platform: listings.platform,
          listingUrl: listings.listingUrl,
          listingPriceTry: listings.listingPriceTry,
          listingDate: listings.listingDate,
          conditionGrade: listings.conditionGrade,
          isNew: listings.isNew,
          lastCheckedAt: listings.lastCheckedAt,
          createdAt: listings.createdAt,
        })
        .from(listings)
        .where(eq(listings.isNew, true))
        .orderBy(desc(listings.createdAt), desc(listings.id));

      return legacyRows
        .map((row) => {
          const prov = classifyLegacyListingProvenance(row);
          return mapRowToMarketplaceListing(
            { ...row, isSimulated: prov.isSimulated, dataOrigin: prov.dataOrigin },
            requestingUserId
          );
        })
        .filter((item) => includeSimulated || !item.isSimulated);
    }

    handleDatabaseQueryFailure('listings.getDatabaseListings', error);
    return getMemoryListings(requestingUserId, includeSimulated);
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
        isSimulated: false,
        dataOrigin: 'user_submitted',
        lastCheckedAt: now,
      })
      .returning();

    await db.insert(priceLogs).values({
      partId: input.partId,
      listingId: created.id,
      platform: input.platform,
      priceTry: created.listingPriceTry,
      isNew: created.isNew,
      isSimulated: false,
      dataOrigin: 'user_submitted',
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
      .select({
        id: listings.id,
        userId: listings.userId,
      })
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
  isNew?: boolean,
  options?: { includeSimulated?: boolean }
): Promise<PriceHistoryPoint[]> {
  const includeSimulated = options?.includeSimulated ?? false;

  if (!isDatabaseConfigured) {
    return getMemoryPartPriceHistory(partId, isNew, includeSimulated);
  }

  try {
    const filters = [eq(priceLogs.partId, partId)];
    if (isNew !== undefined) {
      filters.push(eq(priceLogs.isNew, isNew));
    }
    if (!includeSimulated) {
      filters.push(eq(priceLogs.isSimulated, false));
      filters.push(
        notInArray(priceLogs.dataOrigin, [
          'synthetic_fallback',
          'synthetic_backfill',
        ])
      );
    }

    const rows = await db
      .select({
        priceTry: priceLogs.priceTry,
        recordedAt: priceLogs.recordedAt,
      })
      .from(priceLogs)
      .where(and(...filters))
      .orderBy(asc(priceLogs.recordedAt), asc(priceLogs.id));

    return rows.map((r) => ({
      date: r.recordedAt.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
      }),
      price: r.priceTry,
    }));
  } catch (error) {
    if (isUndefinedColumnError(error)) {
      console.warn(
        '[DB Migration Pending] price_logs tablosunda is_simulated/data_origin sütunları henüz yok; güvenli tarihçe filtresi kullanılıyor.'
      );
      const baseFilters = [eq(priceLogs.partId, partId)];
      if (isNew !== undefined) {
        baseFilters.push(eq(priceLogs.isNew, isNew));
      }

      const legacyRows = await db
        .select({
          priceTry: priceLogs.priceTry,
          recordedAt: priceLogs.recordedAt,
          listingId: priceLogs.listingId,
        })
        .from(priceLogs)
        .where(and(...baseFilters))
        .orderBy(asc(priceLogs.recordedAt), asc(priceLogs.id));

      if (includeSimulated || legacyRows.length === 0) {
        return legacyRows.map((r) => ({
          date: r.recordedAt.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
          }),
          price: r.priceTry,
        }));
      }

      // Yalnızca listing_id üzerinden sentetik ilana bağlı olduğu kanıtlanabilen logları dışla;
      // listing_id NULL olan kayıtlar legacy_unknown olarak korunur.
      const linkedIds = Array.from(
        new Set(
          legacyRows
            .map((r) => r.listingId)
            .filter((id): id is number => typeof id === 'number' && id > 0)
        )
      );

      const syntheticListingIds = new Set<number>();
      if (linkedIds.length > 0) {
        const linkedListings = await db
          .select({
            id: listings.id,
            userId: listings.userId,
            listingUrl: listings.listingUrl,
          })
          .from(listings)
          .where(inArray(listings.id, linkedIds));

        for (const l of linkedListings) {
          if (classifyLegacyListingProvenance(l).isSimulated) {
            syntheticListingIds.add(l.id);
          }
        }
      }

      return legacyRows
        .filter((r) => r.listingId === null || !syntheticListingIds.has(r.listingId))
        .map((r) => ({
          date: r.recordedAt.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
          }),
          price: r.priceTry,
        }));
    }

    handleDatabaseQueryFailure('listings.getPartPriceHistory', error);
    return getMemoryPartPriceHistory(partId, isNew, includeSimulated);
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
  isSimulated?: boolean;
  dataOrigin?: DataOrigin;
}

export async function upsertStoreBotListing(
  input: UpsertStoreBotListingInput
): Promise<{ action: 'created' | 'updated' | 'skipped'; listingId: number }> {
  const dataOrigin = normalizeDataOrigin(
    input.dataOrigin ?? (input.isSimulated ? 'synthetic_fallback' : 'store_feed')
  );
  const isSimulated = Boolean(input.isSimulated) || isSyntheticOrigin(dataOrigin);

  if (isSimulated && !isSyntheticFallbackAllowed()) {
    return { action: 'skipped', listingId: 0 };
  }

  if (!isDatabaseConfigured) {
    return upsertMemoryStoreBotListing({
      ...input,
      isSimulated,
      dataOrigin,
    });
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const roundedPrice = Math.round(input.listingPriceTry);

  try {
    const [existing] = await db
      .select({
        id: listings.id,
        isSimulated: listings.isSimulated,
      })
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
      if (!existing.isSimulated && isSimulated) {
        return { action: 'skipped', listingId: existing.id };
      }

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
          isSimulated,
          dataOrigin,
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
          isSimulated,
          dataOrigin,
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
      isSimulated,
      dataOrigin,
      recordedAt: now,
    });

    return { action, listingId };
  } catch (error) {
    handleDatabaseQueryFailure('listings.upsertStoreBotListing', error);
    return upsertMemoryStoreBotListing({
      ...input,
      isSimulated,
      dataOrigin,
    });
  }
}
