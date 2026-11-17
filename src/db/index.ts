import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import type { ConnectionOptions } from 'node:tls';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

type ConnectionSource =
  | 'DATABASE_URL'
  | 'POSTGRES_URL'
  | 'POSTGRES_PRISMA_URL'
  | 'SQL_HOST'
  | 'none';

interface ResolvedPoolTarget {
  source: ConnectionSource;
  poolConfig: PoolConfig;
  hostLabel: string;
  port: number;
  database: string;
  sslEnabled: boolean;
}

const PLACEHOLDER_HOSTS = new Set(['host', 'your-host', 'example.com', 'localhost.example']);

function isLocalHost(host: string): boolean {
  const lower = host.trim().toLowerCase();
  return lower === 'localhost' || lower === '127.0.0.1' || lower === '::1';
}

function resolveSslOption(
  host: string,
  sslModeParam?: string | null
): boolean | ConnectionOptions {
  const envSsl = process.env.SQL_SSL?.trim().toLowerCase();
  const mode = sslModeParam?.trim().toLowerCase();

  if (envSsl === 'false' || envSsl === 'disable' || mode === 'disable') {
    return false;
  }

  if (isLocalHost(host) && envSsl !== 'true' && envSsl !== 'require' && !mode) {
    return false;
  }

  if (mode === 'verify-full' || process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true') {
    return { rejectUnauthorized: true };
  }

  // Supabase (direct & pooler) ve uzak PostgreSQL sunucuları için TLS/SSL desteği
  return { rejectUnauthorized: false };
}

function parseConnectionUrl(
  rawUrl: string,
  source: Exclude<ConnectionSource, 'SQL_HOST' | 'none'>
): ResolvedPoolTarget | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
      return null;
    }

    const host = parsed.hostname.trim();
    const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, '').trim());
    if (!host || !database || PLACEHOLDER_HOSTS.has(host.toLowerCase())) {
      return null;
    }

    const port = parsed.port ? Number(parsed.port) : 5432;
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      return null;
    }

    const sslMode = parsed.searchParams.get('sslmode');
    const ssl = resolveSslOption(host, sslMode);
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const defaultMax = isServerless || port === 6543 ? 3 : 5;
    const configuredMax = Number(process.env.DB_POOL_MAX);
    const max =
      Number.isInteger(configuredMax) && configuredMax > 0 ? configuredMax : defaultMax;

    const poolConfig: PoolConfig = {
      host,
      port,
      database,
      user: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      ssl,
      max,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: true,
    };

    return {
      source,
      poolConfig,
      hostLabel: host,
      port,
      database,
      sslEnabled: Boolean(ssl),
    };
  } catch {
    return null;
  }
}

function resolvePoolTarget(): ResolvedPoolTarget | null {
  const urlCandidates: Array<{
    source: Exclude<ConnectionSource, 'SQL_HOST' | 'none'>;
    value: string | undefined;
  }> = [
    { source: 'DATABASE_URL', value: process.env.DATABASE_URL?.trim() },
    { source: 'POSTGRES_URL', value: process.env.POSTGRES_URL?.trim() },
    { source: 'POSTGRES_PRISMA_URL', value: process.env.POSTGRES_PRISMA_URL?.trim() },
  ];

  for (const candidate of urlCandidates) {
    if (!candidate.value) continue;
    const parsed = parseConnectionUrl(candidate.value, candidate.source);
    if (parsed) {
      return parsed;
    }
    console.warn(
      `[DB] ${candidate.source} geçersiz veya eksik PostgreSQL bağlantı adresi içeriyor.`
    );
  }

  const sqlHost = process.env.SQL_HOST?.trim();
  const sqlDbName = process.env.SQL_DB_NAME?.trim();
  if (sqlHost && sqlDbName && !PLACEHOLDER_HOSTS.has(sqlHost.toLowerCase())) {
    const port = process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432;
    const ssl = resolveSslOption(sqlHost, null);
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const defaultMax = isServerless || port === 6543 ? 3 : 5;
    const configuredMax = Number(process.env.DB_POOL_MAX);
    const max =
      Number.isInteger(configuredMax) && configuredMax > 0 ? configuredMax : defaultMax;

    return {
      source: 'SQL_HOST',
      poolConfig: {
        host: sqlHost,
        port: Number.isInteger(port) && port > 0 ? port : 5432,
        user: process.env.SQL_USER?.trim() || undefined,
        password: process.env.SQL_PASSWORD || undefined,
        database: sqlDbName,
        ssl,
        max,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
        allowExitOnIdle: true,
      },
      hostLabel: sqlHost,
      port: Number.isInteger(port) && port > 0 ? port : 5432,
      database: sqlDbName,
      sslEnabled: Boolean(ssl),
    };
  }

  return null;
}

const resolvedTarget = resolvePoolTarget();

export const createPool = () => {
  if (!resolvedTarget) {
    return null;
  }
  if (!global._postgresPool) {
    global._postgresPool = new Pool(resolvedTarget.poolConfig);

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

let db: ReturnType<typeof drizzle<typeof schema>>;
let drizzleReady = false;

try {
  if (!pool) {
    throw new Error('PostgreSQL connection string not configured');
  }
  db = drizzle(pool, { schema });
  drizzleReady = true;
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

export const isDatabaseConfigured = Boolean(resolvedTarget && pool && drizzleReady);

export function getDatabaseConnectionMeta() {
  if (!resolvedTarget || !isDatabaseConfigured) {
    return {
      configured: false as const,
      source: 'none' as ConnectionSource,
      host: null,
      port: null,
      database: null,
      sslEnabled: false,
    };
  }
  return {
    configured: true as const,
    source: resolvedTarget.source,
    host: resolvedTarget.hostLabel,
    port: resolvedTarget.port,
    database: resolvedTarget.database,
    sslEnabled: resolvedTarget.sslEnabled,
  };
}

export async function testDatabaseConnection(): Promise<{
  ok: boolean;
  source: ConnectionSource;
  error?: string;
}> {
  if (!pool || !isDatabaseConfigured) {
    return {
      ok: false,
      source: 'none',
      error: 'DATABASE_URL veya POSTGRES_URL tanımlı değil.',
    };
  }
  try {
    await pool.query('SELECT 1');
    return { ok: true, source: resolvedTarget?.source ?? 'DATABASE_URL' };
  } catch (error) {
    return {
      ok: false,
      source: resolvedTarget?.source ?? 'DATABASE_URL',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export { db };
