import { and, asc, desc, eq } from 'drizzle-orm';
import type {
  MarketplaceListing,
  MarketplacePlatform,
  ProductConditionGrade,
} from '../types/pc.ts';
import { db } from './index.ts';
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

function mapRowToMarketplaceListing(
  row: typeof listings.$inferSelect,
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

export async function getDatabaseListings(
  requestingUserId?: number
): Promise<MarketplaceListing[]> {
  try {
    const rows = await db
      .select()
      .from(listings)
      .orderBy(desc(listings.createdAt), desc(listings.id));
    return rows.map((r) => mapRowToMarketplaceListing(r, requestingUserId));
  } catch (error) {
    console.error('Database listings query failed:', error);
    throw new Error('İlan verileri veritabanından okunamadı.', { cause: error });
  }
}

export async function createDatabaseListing(
  input: DbCreateListingParams
): Promise<MarketplaceListing> {
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
      priceTry: created.listingPriceTry,
      isNew: created.isNew,
      recordedAt: now,
    });

    return mapRowToMarketplaceListing(created, input.userId);
  } catch (error) {
    console.error('Database create listing failed:', error);
    throw new Error('İlan kaydı veritabanına kaydedilemedi.', { cause: error });
  }
}

export async function deleteDatabaseListing(
  listingIdRaw: string,
  userId: number
): Promise<'deleted' | 'not_found' | 'forbidden'> {
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
    console.error('Database delete listing failed:', error);
    throw new Error('İlan kaydı veritabanından silinemedi.', { cause: error });
  }
}

export async function getPartPriceHistory(
  partId: string,
  isNew?: boolean
): Promise<PriceHistoryPoint[]> {
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
    console.error('Database price history query failed:', error);
    throw new Error('Fiyat geçmişi veritabanından okunamadı.', { cause: error });
  }
}

export type StoreBotPlatform = 'Vatan' | 'İtopya' | 'Sinerji' | 'Trendyol';

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
      priceTry: roundedPrice,
      isNew: true,
      recordedAt: now,
    });

    return { action, listingId };
  } catch (error) {
    console.error('Database store bot upsert failed:', error);
    throw new Error('Mağaza fiyat botu kaydı veritabanına yazılamadı.', {
      cause: error,
    });
  }
}
