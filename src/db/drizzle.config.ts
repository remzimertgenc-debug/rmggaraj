import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import type { ConnectionOptions } from 'node:tls';

dotenv.config();

function isLocalHost(host: string): boolean {
  const lower = host.trim().toLowerCase();
  return lower === 'localhost' || lower === '127.0.0.1' || lower === '::1';
}

function resolveMigrationSsl(
  host: string,
  sslMode?: string | null
): boolean | ConnectionOptions {
  const envSsl = process.env.SQL_SSL?.trim().toLowerCase();
  const mode = sslMode?.trim().toLowerCase();

  if (envSsl === 'false' || envSsl === 'disable' || mode === 'disable') {
    return false;
  }

  if (isLocalHost(host) && envSsl !== 'true' && envSsl !== 'require' && !mode) {
    return false;
  }

  if (mode === 'verify-full' || process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true') {
    return { rejectUnauthorized: true };
  }

  return { rejectUnauthorized: false };
}

function resolveMigrationCredentials() {
  const urlCandidate =
    process.env.DIRECT_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.POSTGRES_URL?.trim();

  if (urlCandidate) {
    let parsed: URL;
    try {
      parsed = new URL(urlCandidate);
    } catch {
      throw new Error(
        'DIRECT_URL / DATABASE_URL geçerli bir PostgreSQL bağlantı adresi olmalıdır.'
      );
    }

    if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
      throw new Error(
        'DIRECT_URL / DATABASE_URL postgresql:// veya postgres:// protokolü ile başlamalıdır.'
      );
    }

    const host = parsed.hostname.trim();
    const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, '').trim());
    if (!host || !database) {
      throw new Error(
        'DIRECT_URL / DATABASE_URL içinde host ve veritabanı adı bulunmalıdır.'
      );
    }

    const port = parsed.port ? Number(parsed.port) : 5432;
    const sslMode = parsed.searchParams.get('sslmode');

    return {
      host,
      port: Number.isInteger(port) && port > 0 ? port : 5432,
      user: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      database,
      ssl: resolveMigrationSsl(host, sslMode),
    };
  }

  const sqlHost = process.env.SQL_HOST?.trim();
  const sqlDbName = process.env.SQL_DB_NAME?.trim();
  const user = (process.env.SQL_ADMIN_USER || process.env.SQL_USER)?.trim();
  const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;

  if (!sqlHost || !sqlDbName || !user || !password) {
    throw new Error(
      'DIRECT_URL (veya yedek olarak DATABASE_URL) ortam değişkeni tanımlanmalıdır.'
    );
  }

  const port = process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432;
  return {
    host: sqlHost,
    port: Number.isInteger(port) && port > 0 ? port : 5432,
    user,
    password,
    database: sqlDbName,
    ssl: resolveMigrationSsl(sqlHost, null),
  };
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials: resolveMigrationCredentials(),
  verbose: true,
});
