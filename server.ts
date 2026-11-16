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

const PORT = Number(process.env.PORT ?? 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

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
      void runPriceBotSync();
    }
  });
}

startServer();
