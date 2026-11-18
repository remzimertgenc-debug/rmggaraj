import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { runPriceBotSync } from './pricing/bot.ts';
import { findMatchingPartId } from './pricing/matcher.ts';
import {
  fetchPartPriceHistory,
  getPricingCatalog,
} from './pricing/providers.ts';
import {
  logSafeDatabaseDiagnostic,
  testDatabaseConnection,
} from '../src/db/index.ts';
import {
  type AuthRequest,
  optionalAuth,
  requireAuth,
  requireBotAdminOrCron,
} from '../src/middleware/auth.ts';

const DATABASE_HEALTH_TIMEOUT_MS = 5000;

async function handleBotRun(_req: AuthRequest, res: Response) {
  try {
    const result = await runPriceBotSync();
    if (result.skippedDueToLock) {
      res.status(409).json({
        ok: false,
        error:
          result.lockReason ??
          'Fiyat botu senkronizasyonu zaten çalışıyor.',
        result,
      });
      return;
    }
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Fiyat botu çalıştırılamadı.',
    });
  }
}

export function createApiApp(): express.Express {
  const app = express();

  // Reverse proxy (Vercel / Cloud Run / Nginx) arkasında gerçek istemci IP adresini okuyabilmek için
  app.set('trust proxy', 1);
  app.use(express.json());

  // Temel API Güvenlik Duvarı: Kötü niyetli bot ve scraping trafiğine karşı IP başına dakikada en fazla 100 istek
  const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 dakika
    max: 100, // IP başına dakikada maksimum 100 istek
    standardHeaders: true, // RateLimit-* HTTP başlıklarını döndür
    legacyHeaders: false,
    message: {
      error:
        'Çok fazla istek gönderildi. Güvenlik koruması nedeniyle lütfen 1 dakika sonra tekrar deneyin.',
    },
  });

  // Senkronizasyon uç noktaları için ek sıkı hız limiti (IP başına dakikada 25 istek)
  const writeApiRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 25,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error:
        'Senkronizasyon istek limiti aşıldı. Lütfen kısa süre bekleyip tekrar deneyin.',
    },
  });

  app.use('/api', apiRateLimiter);

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'rmg-tech-pricing-api' });
  });

  app.all('/api/health/database', async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'GET') {
      res.status(405).json({ ok: false, database: 'disconnected' });
      return;
    }

    try {
      const result = await testDatabaseConnection({
        timeoutMs: DATABASE_HEALTH_TIMEOUT_MS,
      });

      if (result.ok) {
        res.status(200).json({ ok: true, database: 'connected' });
        return;
      }

      logSafeDatabaseDiagnostic(result.diagnostic);
      res.status(503).json({ ok: false, database: 'disconnected' });
    } catch {
      console.error('[DB Health] PostgreSQL connection check failed:', {
        ok: false,
        category: 'OTHER_CONNECTION_ERROR',
        errorCode: 'HANDLER_EXCEPTION',
        vercel: Boolean(process.env.VERCEL),
      });
      res.status(503).json({ ok: false, database: 'disconnected' });
    }
  });

  app.get('/api/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
    res.json({
      uid: req.user?.uid,
      email: req.user?.email ?? null,
      dbUserId: req.dbUserId ?? null,
    });
  });

  app.get('/api/pricing/catalog', optionalAuth, async (req: AuthRequest, res: Response) => {
    try {
      const catalog = await getPricingCatalog(req.dbUserId);
      res.json(catalog);
    } catch (error) {
      res.status(502).json({
        error:
          error instanceof Error
            ? error.message
            : 'Fiyat veri sağlayıcısı yanıt vermedi.',
      });
    }
  });

  app.get('/api/pricing/history/:partId', async (req: Request, res: Response) => {
    try {
      const partId = String(req.params.partId ?? '').trim();
      if (!partId) {
        res.status(400).json({ error: 'Parça kimliği gereklidir.' });
        return;
      }
      const history = await fetchPartPriceHistory(partId, true);
      res.json({ partId, history });
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Fiyat geçmişi yüklenemedi.',
      });
    }
  });

  app.post('/api/pricing/match', (req: Request, res: Response) => {
    const rawName = String(req.body?.productName ?? '').trim();
    const matchedPartId = findMatchingPartId(rawName);
    res.json({ productName: rawName, partId: matchedPartId });
  });

  app
    .route('/api/pricing/bot/run')
    .get(writeApiRateLimiter, requireBotAdminOrCron, handleBotRun)
    .post(writeApiRateLimiter, requireBotAdminOrCron, handleBotRun);

  // Bilinmeyen tüm /api/* rotalarının SPA index.html'e düşmesini önleyip JSON 404 döndür
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API uç noktası bulunamadı.' });
  });

  return app;
}
