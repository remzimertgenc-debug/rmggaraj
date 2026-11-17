import 'dotenv/config';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  logSafeDatabaseDiagnostic,
  testDatabaseConnection,
} from '../../src/db/index.ts';

const DATABASE_HEALTH_TIMEOUT_MS = 5000;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, database: 'disconnected' }));
    return;
  }

  try {
    const result = await testDatabaseConnection({
      timeoutMs: DATABASE_HEALTH_TIMEOUT_MS,
    });

    if (result.ok) {
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, database: 'connected' }));
      return;
    }

    logSafeDatabaseDiagnostic(result.diagnostic);
    res.statusCode = 503;
    res.end(JSON.stringify({ ok: false, database: 'disconnected' }));
  } catch {
    console.error('[DB Health] PostgreSQL connection check failed:', {
      ok: false,
      category: 'OTHER_CONNECTION_ERROR',
      errorCode: 'HANDLER_EXCEPTION',
      vercel: Boolean(process.env.VERCEL),
    });
    res.statusCode = 503;
    res.end(JSON.stringify({ ok: false, database: 'disconnected' }));
  }
}
