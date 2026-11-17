import 'dotenv/config';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { testDatabaseConnection } from '../../src/db/index.ts';

const DATABASE_HEALTH_TIMEOUT_MS = 5000;

async function checkDatabaseWithTimeout(): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      testDatabaseConnection(),
      new Promise<{ ok: false }>((resolve) => {
        timer = setTimeout(() => resolve({ ok: false }), DATABASE_HEALTH_TIMEOUT_MS);
      }),
    ]);
    return Boolean(result?.ok);
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, database: 'disconnected' }));
    return;
  }

  const connected = await checkDatabaseWithTimeout();
  if (connected) {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, database: 'connected' }));
    return;
  }

  res.statusCode = 503;
  res.end(JSON.stringify({ ok: false, database: 'disconnected' }));
}
