import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { runPriceBotSync, startPriceBot } from './server/pricing/bot.ts';
import { findMatchingPartId } from './server/pricing/matcher.ts';
import {
  fetchPartPriceHistory,
  getPricingCatalog,
} from './server/pricing/providers.ts';
import {
  type AuthRequest,
  optionalAuth,
  requireAuth,
} from './src/middleware/auth.ts';
import { testDatabaseConnection } from './src/db/index.ts';

const PORT = Number(process.env.PORT ?? 3000);
const IS_PROD = process.env.NODE_ENV === 'production';
const DATABASE_HEALTH_TIMEOUT_MS = 5000;

async function checkDatabaseHealth(): Promise<boolean> {
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

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);

  // Reverse proxy (Cloud Run / Nginx) arkasında gerçek istemci IP adresini okuyabilmek için
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

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'rmg-tech-pricing-api' });
  });

  app.get('/api/health/database', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const connected = await checkDatabaseHealth();
    if (connected) {
      res.status(200).json({ ok: true, database: 'connected' });
      return;
    }
    res.status(503).json({ ok: false, database: 'disconnected' });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
    res.json({
      uid: req.user?.uid,
      email: req.user?.email ?? null,
      dbUserId: req.dbUserId ?? null,
    });
  });

  app.get('/api/pricing/catalog', optionalAuth, async (req: AuthRequest, res) => {
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

  app.get('/api/pricing/history/:partId', async (req, res) => {
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

  app.post('/api/pricing/match', (req, res) => {
    const rawName = String(req.body?.productName ?? '').trim();
    const matchedPartId = findMatchingPartId(rawName);
    res.json({ productName: rawName, partId: matchedPartId });
  });

  app.post('/api/pricing/bot/run', writeApiRateLimiter, requireAuth, async (_req: AuthRequest, res) => {
    try {
      const result = await runPriceBotSync();
      res.json({ ok: true, result });
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Fiyat botu çalıştırılamadı.',
      });
    }
  });

  if (!IS_PROD) {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        port: PORT,
        allowedHosts: true,
        hmr: disableHmr ? false : { server: httpServer },
        watch: disableHmr ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`RMG TECH server running at http://0.0.0.0:${PORT}`);
    startPriceBot();
    if (!process.env.SQL_HOST?.trim()) {
      void runPriceBotSync().catch((error) => {
        console.error(
          '[PriceBot] Başlangıç senkronizasyonu veritabanı hatası:',
          error instanceof Error ? error.message : error
        );
      });
    }
  });
}

startServer();
