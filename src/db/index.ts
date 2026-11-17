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

export type DatabaseErrorCategory =
  | 'DATABASE_URL_MISSING'
  | 'INVALID_DATABASE_URL'
  | 'DNS_ERROR'
  | 'CONNECTION_TIMEOUT'
  | 'POSTGRES_AUTH_ERROR'
  | 'SSL_TLS_ERROR'
  | 'OTHER_CONNECTION_ERROR';

export interface DatabaseDiagnosticSummary {
  ok: boolean;
  source: ConnectionSource;
  category: DatabaseErrorCategory | null;
  errorCode: string | null;
  hasDatabaseUrl: boolean;
  hasPostgresUrl: boolean;
  hasDirectUrl: boolean;
  invalidSources: ConnectionSource[];
  sslEnabled: boolean;
  vercel: boolean;
}

export interface DatabaseConnectionTestResult {
  ok: boolean;
  source: ConnectionSource;
  category?: DatabaseErrorCategory;
  errorCode?: string;
  diagnostic: DatabaseDiagnosticSummary;
}

interface ResolvedPoolTarget {
  source: ConnectionSource;
  poolConfig: PoolConfig;
  hostLabel: string;
  port: number;
  database: string;
  sslEnabled: boolean;
}

interface PoolResolutionState {
  target: ResolvedPoolTarget | null;
  invalidSources: ConnectionSource[];
  hasDatabaseUrl: boolean;
  hasPostgresUrl: boolean;
  hasDirectUrl: boolean;
}

const PLACEHOLDER_HOSTS = new Set(['host', 'your-host', 'example.com', 'localhost.example']);
const SAFE_CODE_PATTERN = /^[A-Z0-9_]{2,40}$/;

function sanitizeEnvUrlValue(rawValue: string | undefined): string {
  if (!rawValue) return '';
  let cleaned = rawValue.trim();
  while (
    cleaned.length >= 2 &&
    ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'")))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned.replace(/^['"]+|['"]+$/g, '').trim();
}

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

function resolvePoolTarget(): PoolResolutionState {
  const cleanedDatabaseUrl = sanitizeEnvUrlValue(process.env.DATABASE_URL);
  const cleanedPostgresUrl = sanitizeEnvUrlValue(process.env.POSTGRES_URL);
  const cleanedPostgresPrismaUrl = sanitizeEnvUrlValue(process.env.POSTGRES_PRISMA_URL);
  const cleanedDirectUrl = sanitizeEnvUrlValue(process.env.DIRECT_URL);

  const urlCandidates: Array<{
    source: Exclude<ConnectionSource, 'SQL_HOST' | 'none'>;
    value: string;
  }> = [
    { source: 'DATABASE_URL', value: cleanedDatabaseUrl },
    { source: 'POSTGRES_URL', value: cleanedPostgresUrl },
    { source: 'POSTGRES_PRISMA_URL', value: cleanedPostgresPrismaUrl },
  ];

  const invalidSources: ConnectionSource[] = [];
  let target: ResolvedPoolTarget | null = null;

  for (const candidate of urlCandidates) {
    if (!candidate.value) continue;
    const parsed = parseConnectionUrl(candidate.value, candidate.source);
    if (parsed) {
      target = parsed;
      break;
    }
    invalidSources.push(candidate.source);
    console.warn(`[DB] ${candidate.source} geçersiz PostgreSQL bağlantı adresi içeriyor.`);
  }

  if (!target) {
    const sqlHost = sanitizeEnvUrlValue(process.env.SQL_HOST);
    const sqlDbName = sanitizeEnvUrlValue(process.env.SQL_DB_NAME);
    if (sqlHost && sqlDbName && !PLACEHOLDER_HOSTS.has(sqlHost.toLowerCase())) {
      const port = process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432;
      const ssl = resolveSslOption(sqlHost, null);
      const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
      const defaultMax = isServerless || port === 6543 ? 3 : 5;
      const configuredMax = Number(process.env.DB_POOL_MAX);
      const max =
        Number.isInteger(configuredMax) && configuredMax > 0 ? configuredMax : defaultMax;

      target = {
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
    } else if (sqlHost || sqlDbName) {
      invalidSources.push('SQL_HOST');
    }
  }

  return {
    target,
    invalidSources,
    hasDatabaseUrl: Boolean(cleanedDatabaseUrl),
    hasPostgresUrl: Boolean(cleanedPostgresUrl),
    hasDirectUrl: Boolean(cleanedDirectUrl),
  };
}

function extractErrorSignals(error: unknown): {
  codes: string[];
  lowerMessages: string[];
  errorCode: string;
} {
  const codes: string[] = [];
  const lowerMessages: string[] = [];
  const visited = new Set<unknown>();

  const collect = (item: unknown) => {
    if (!item || typeof item !== 'object' || visited.has(item)) return;
    visited.add(item);

    const record = item as {
      code?: unknown;
      message?: unknown;
      cause?: unknown;
      errors?: unknown;
    };

    if (typeof record.code === 'string' && record.code.trim()) {
      const normalized = record.code.trim().toUpperCase();
      if (SAFE_CODE_PATTERN.test(normalized)) {
        codes.push(normalized);
      }
    }
    if (typeof record.message === 'string' && record.message.trim()) {
      lowerMessages.push(record.message.toLowerCase());
    }
    if (record.cause) {
      collect(record.cause);
    }
    if (Array.isArray(record.errors)) {
      for (const subError of record.errors) {
        collect(subError);
      }
    }
  };

  if (typeof error === 'string') {
    lowerMessages.push(error.toLowerCase());
  } else {
    collect(error);
  }

  return {
    codes,
    lowerMessages,
    errorCode: codes[0] ?? 'UNKNOWN',
  };
}

export function classifyDatabaseError(error: unknown): {
  category: DatabaseErrorCategory;
  errorCode: string;
} {
  const { codes, lowerMessages, errorCode } = extractErrorSignals(error);
  const combinedMessage = lowerMessages.join(' | ');

  if (
    codes.some((c) =>
      ['ENOTFOUND', 'EAI_AGAIN', 'ENODATA', 'EDNSREFUSED', 'ESERVFAIL', 'EAI_NONAME'].includes(c)
    ) ||
    combinedMessage.includes('getaddrinfo') ||
    combinedMessage.includes('enotfound') ||
    combinedMessage.includes('eai_again')
  ) {
    return { category: 'DNS_ERROR', errorCode };
  }

  if (
    codes.some(
      (c) =>
        c.startsWith('ERR_TLS_') ||
        c.startsWith('ERR_SSL_') ||
        [
          'SELF_SIGNED_CERT_IN_CHAIN',
          'DEPTH_ZERO_SELF_SIGNED_CERT',
          'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
          'CERT_HAS_EXPIRED',
          'UNABLE_TO_GET_ISSUER_CERT',
          'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
        ].includes(c)
    ) ||
    (codes.includes('EPROTO') &&
      (combinedMessage.includes('ssl') || combinedMessage.includes('tls'))) ||
    combinedMessage.includes('self-signed certificate') ||
    combinedMessage.includes('self signed certificate') ||
    combinedMessage.includes('does not support ssl') ||
    combinedMessage.includes('no encryption') ||
    combinedMessage.includes('ssl') ||
    combinedMessage.includes('tls') ||
    combinedMessage.includes('certificate')
  ) {
    return { category: 'SSL_TLS_ERROR', errorCode };
  }

  if (
    codes.some((c) => c === '28P01' || c === '28000') ||
    combinedMessage.includes('password authentication failed') ||
    combinedMessage.includes('tenant or user not found') ||
    combinedMessage.includes('authentication failed') ||
    combinedMessage.includes('no pg_hba.conf entry')
  ) {
    return { category: 'POSTGRES_AUTH_ERROR', errorCode };
  }

  if (
    codes.some((c) =>
      ['ETIMEDOUT', 'ECONNABORTED', 'ESOCKETTIMEDOUT', '57014', 'HEALTH_CHECK_TIMEOUT'].includes(c)
    ) ||
    combinedMessage.includes('timeout') ||
    combinedMessage.includes('timed out')
  ) {
    return { category: 'CONNECTION_TIMEOUT', errorCode };
  }

  return { category: 'OTHER_CONNECTION_ERROR', errorCode };
}

const resolutionState = resolvePoolTarget();
const resolvedTarget = resolutionState.target;

export const createPool = () => {
  if (!resolvedTarget) {
    return null;
  }
  if (!global._postgresPool) {
    global._postgresPool = new Pool(resolvedTarget.poolConfig);

    global._postgresPool.on('error', (err) => {
      const classified = classifyDatabaseError(err);
      console.error('[DB] Idle SQL pool client error:', {
        category: classified.category,
        errorCode: classified.errorCode,
      });
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

function buildDiagnosticSummary(params: {
  ok: boolean;
  source: ConnectionSource;
  category: DatabaseErrorCategory | null;
  errorCode: string | null;
}): DatabaseDiagnosticSummary {
  return {
    ok: params.ok,
    source: params.source,
    category: params.category,
    errorCode: params.errorCode,
    hasDatabaseUrl: resolutionState.hasDatabaseUrl,
    hasPostgresUrl: resolutionState.hasPostgresUrl,
    hasDirectUrl: resolutionState.hasDirectUrl,
    invalidSources: resolutionState.invalidSources,
    sslEnabled: resolvedTarget?.sslEnabled ?? false,
    vercel: Boolean(process.env.VERCEL),
  };
}

export function logSafeDatabaseDiagnostic(summary: DatabaseDiagnosticSummary): void {
  if (summary.ok) return;
  console.error('[DB Health] PostgreSQL connection check failed:', summary);
}

export function isProductionEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production'
  );
}

export function shouldDisallowMemoryFallback(): boolean {
  return isDatabaseConfigured && isProductionEnvironment();
}

export class DatabaseOperationError extends Error {
  public readonly operation: string;
  public readonly category: DatabaseErrorCategory;
  public readonly errorCode: string;

  constructor(operation: string, error: unknown) {
    const classified = classifyDatabaseError(error);
    const pgCode =
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string' &&
      SAFE_CODE_PATTERN.test((error as { code: string }).code.trim().toUpperCase())
        ? (error as { code: string }).code.trim().toUpperCase()
        : classified.errorCode;

    let reasonHint = 'Veritabanı sorgusu başarısız oldu.';
    if (pgCode === '42P01') {
      reasonHint =
        'Gerekli veritabanı tablosu bulunamadı (migration henüz uygulanmamış olabilir).';
    } else if (pgCode === '42703') {
      reasonHint =
        'Veritabanı sütun şeması güncel değil (bekleyen migration olabilir).';
    } else if (pgCode === '23503') {
      reasonHint = 'Veritabanı ilişki (foreign key) doğrulaması başarısız oldu.';
    } else if (pgCode === '23505') {
      reasonHint = 'Veritabanı tekillik (unique) kısıtı ihlal edildi.';
    } else if (classified.category === 'CONNECTION_TIMEOUT') {
      reasonHint = 'Veritabanı bağlantısı zaman aşımına uğradı.';
    } else if (classified.category === 'POSTGRES_AUTH_ERROR') {
      reasonHint = 'Veritabanı kimlik doğrulaması başarısız oldu.';
    } else if (classified.category === 'SSL_TLS_ERROR') {
      reasonHint = 'Veritabanı SSL/TLS doğrulaması başarısız oldu.';
    } else if (classified.category === 'DNS_ERROR') {
      reasonHint = 'Veritabanı sunucu adresi çözümlenemedi.';
    }

    super(`[DB:${operation}] ${reasonHint} (${classified.category} / ${pgCode})`);
    this.name = 'DatabaseOperationError';
    this.operation = operation;
    this.category = classified.category;
    this.errorCode = pgCode;
  }
}

export function handleDatabaseQueryFailure(
  operation: string,
  error: unknown
): DatabaseOperationError {
  const opError =
    error instanceof DatabaseOperationError
      ? error
      : new DatabaseOperationError(operation, error);

  const logPayload = {
    operation: opError.operation,
    category: opError.category,
    errorCode: opError.errorCode,
    source: resolvedTarget?.source ?? 'none',
    hasDatabaseUrl: resolutionState.hasDatabaseUrl,
    production: isProductionEnvironment(),
    fallbackBlocked: shouldDisallowMemoryFallback(),
  };

  if (shouldDisallowMemoryFallback()) {
    console.error('[DB Error] Production database operation failed (RAM fallback disabled):', logPayload);
    throw opError;
  }

  console.warn('[DB Fallback] Development database query failed — using in-memory fallback:', logPayload);
  return opError;
}

export async function testDatabaseConnection(options?: {
  timeoutMs?: number;
}): Promise<DatabaseConnectionTestResult> {
  const source: ConnectionSource = resolvedTarget?.source ?? 'none';

  if (!pool || !isDatabaseConfigured) {
    const category: DatabaseErrorCategory =
      resolutionState.invalidSources.length > 0
        ? 'INVALID_DATABASE_URL'
        : 'DATABASE_URL_MISSING';
    const errorCode = category;
    return {
      ok: false,
      source: 'none',
      category,
      errorCode,
      diagnostic: buildDiagnosticSummary({
        ok: false,
        source: 'none',
        category,
        errorCode,
      }),
    };
  }

  let settledByTimeout = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const queryPromise = pool
    .query('SELECT 1')
    .then((): DatabaseConnectionTestResult => ({
      ok: true,
      source,
      diagnostic: buildDiagnosticSummary({
        ok: true,
        source,
        category: null,
        errorCode: null,
      }),
    }))
    .catch((error): DatabaseConnectionTestResult => {
      const classified = classifyDatabaseError(error);
      if (settledByTimeout) {
        // 5s health check zaman aşımından sonra havuzun 10s içinde verdiği gerçek hatayı güvenli biçimde logla
        logSafeDatabaseDiagnostic(
          buildDiagnosticSummary({
            ok: false,
            source,
            category: classified.category,
            errorCode: classified.errorCode,
          })
        );
      }
      return {
        ok: false,
        source,
        category: classified.category,
        errorCode: classified.errorCode,
        diagnostic: buildDiagnosticSummary({
          ok: false,
          source,
          category: classified.category,
          errorCode: classified.errorCode,
        }),
      };
    });

  if (typeof options?.timeoutMs === 'number' && options.timeoutMs > 0) {
    const timeoutPromise = new Promise<DatabaseConnectionTestResult>((resolve) => {
      timer = setTimeout(() => {
        settledByTimeout = true;
        resolve({
          ok: false,
          source,
          category: 'CONNECTION_TIMEOUT',
          errorCode: 'HEALTH_CHECK_TIMEOUT',
          diagnostic: buildDiagnosticSummary({
            ok: false,
            source,
            category: 'CONNECTION_TIMEOUT',
            errorCode: 'HEALTH_CHECK_TIMEOUT',
          }),
        });
      }, options.timeoutMs);
    });

    try {
      return await Promise.race([queryPromise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return queryPromise;
}

export async function withDatabaseAdvisoryLock<T>(
  lockId: number,
  fn: () => Promise<T>
): Promise<{ acquired: true; value: T } | { acquired: false }> {
  if (!pool || !isDatabaseConfigured) {
    const value = await fn();
    return { acquired: true, value };
  }

  let client: import('pg').PoolClient | undefined;
  let lockAcquired = false;

  try {
    client = await pool.connect();
    const res = await client.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock($1) AS locked',
      [lockId]
    );
    lockAcquired = Boolean(res.rows[0]?.locked);
    if (!lockAcquired) {
      return { acquired: false };
    }

    const value = await fn();
    return { acquired: true, value };
  } catch (error) {
    if (!lockAcquired && !shouldDisallowMemoryFallback()) {
      console.warn(
        '[PriceBot] Veritabanı advisory lock alınamadı; yerel kilit ile devam ediliyor:',
        error instanceof Error ? error.message : error
      );
      const value = await fn();
      return { acquired: true, value };
    }
    throw error;
  } finally {
    if (client && lockAcquired) {
      await client
        .query('SELECT pg_advisory_unlock($1)', [lockId])
        .catch(() => undefined);
    }
    client?.release();
  }
}

export { db };
