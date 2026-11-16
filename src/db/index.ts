import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const isDatabaseConfigured = Boolean(
  process.env.SQL_HOST?.trim() && process.env.SQL_DB_NAME?.trim()
);

export const createPool = () => {
  if (!isDatabaseConfigured) {
    return null;
  }
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

let db: ReturnType<typeof drizzle<typeof schema>>;
try {
  if (!pool) {
    throw new Error('SQL_HOST not configured');
  }
  db = drizzle(pool, { schema });
} catch {
  console.warn('[AI Studio] Database not connected — using in-memory mock');
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: { data?: Record<string, unknown> }) => d?.data ?? {},
    update: async (d: { data?: Record<string, unknown> }) => d?.data ?? {},
    delete: async () => ({}),
  };
  db = new Proxy(
    {},
    {
      get: (_, prop) =>
        prop === 'query'
          ? new Proxy({}, { get: () => noOp })
          : async () => [],
    }
  ) as unknown as ReturnType<typeof drizzle<typeof schema>>;
}

export { db };
