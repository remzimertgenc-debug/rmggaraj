import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Firebase Auth ile eşlenen kullanıcılar
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Donanım bileşenleri için gerçek pazar yeri ve mağaza ilanları
export const listings = pgTable('listings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  partId: text('part_id').notNull(),
  productName: text('product_name').notNull(),
  brandModel: text('brand_model').notNull(),
  platform: text('platform').notNull(),
  listingUrl: text('listing_url').notNull(),
  listingPriceTry: integer('listing_price_try').notNull(),
  listingDate: text('listing_date').notNull(),
  conditionGrade: text('condition_grade').notNull(),
  isNew: boolean('is_new').notNull().default(false),
  lastCheckedAt: timestamp('last_checked_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Parça bazlı fiyat geçmişi kayıtları (PriceHistoryChart için)
export const priceLogs = pgTable('price_logs', {
  id: serial('id').primaryKey(),
  partId: text('part_id').notNull(),
  listingId: integer('listing_id').references(() => listings.id, {
    onDelete: 'cascade',
  }),
  priceTry: integer('price_try').notNull(),
  isNew: boolean('is_new').notNull().default(true),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  listings: many(listings),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  author: one(users, {
    fields: [listings.userId],
    references: [users.id],
  }),
  priceLogs: many(priceLogs),
}));

export const priceLogsRelations = relations(priceLogs, ({ one }) => ({
  listing: one(listings, {
    fields: [priceLogs.listingId],
    references: [listings.id],
  }),
}));

// Mağaza XML/JSON beslemelerinden otomatik keşfedilen veya katalogdan aktarılan donanım ürünleri
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  category: text('category').notNull(),
  brand: text('brand').notNull(),
  name: text('name').notNull(),
  specSummary: text('spec_summary').notNull().default(''),
  imageUrl: text('image_url'),
  socket: text('socket'), // Örn: AM4, AM5, LGA1700, LGA1851
  ramType: text('ram_type'), // Örn: DDR4, DDR5, DDR4,DDR5
  formFactor: text('form_factor'), // Örn: ATX, Micro-ATX, Mini-ITX
  tdp: integer('tdp'), // Güç tüketimi (Watt)
  wattage: integer('wattage'), // PSU gücü veya soğutucu kapasitesi (Watt)
  maxGpuLengthMm: integer('max_gpu_length_mm'), // GPU uzunluğu veya kasa maks. GPU alanı (mm)
  isCatalogCore: boolean('is_catalog_core').notNull().default(false),
  sourceStore: text('source_store'),
  externalUrl: text('external_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
