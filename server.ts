import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { runPriceBotSync, startPriceBot } from './server/pricing/bot.ts';
import { findMatchingPartId } from './server/pricing/matcher.ts';
import {
  addUserMarketplaceListing,
  deleteUserMarketplaceListing,
  fetchPartPriceHistory,
  getPricingCatalog,
} from './server/pricing/providers.ts';
import {
  type AuthRequest,
  optionalAuth,
  requireAuth,
} from './src/middleware/auth.ts';
import type { MarketplacePlatform, ProductConditionGrade } from './src/types/pc.ts';

const PORT = Number(process.env.PORT ?? 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

const VALID_PLATFORMS: MarketplacePlatform[] = [
  'Sahibinden',
  'Letgo',
  'Facebook Marketplace',
  'Yetkili Sağlayıcı',
];

const VALID_CONDITIONS: ProductConditionGrade[] = [
  'Sıfır / Kapalı Kutu',
  'Çok İyi (Faturalı)',
  'İyi',
  'Orta',
];

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

  // Yazma ve ilan ekleme uç noktaları için ek sıkı hız limiti (IP başına dakikada 25 istek)
  const writeApiRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 25,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error:
        'İlan veya senkronizasyon istek limiti aşıldı. Lütfen kısa süre bekleyip tekrar deneyin.',
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
      const isNewParam = req.query.isNew;
      const isNew =
        isNewParam === 'true' ? true : isNewParam === 'false' ? false : undefined;
      const history = await fetchPartPriceHistory(partId, isNew);
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

  app.post('/api/pricing/listings', writeApiRateLimiter, requireAuth, async (req: AuthRequest, res) => {
    try {
      const body = req.body ?? {};
      const partId = String(body.partId ?? '').trim();
      const listingPriceTry = Number(body.listingPriceTry);
      const platform = body.platform as MarketplacePlatform;
      const listingUrl = String(body.listingUrl ?? '').trim();
      const listingDate = String(body.listingDate ?? '').trim();
      const conditionGrade = body.conditionGrade as ProductConditionGrade;
      const isNew = Boolean(body.isNew);

      if (!partId) {
        res.status(400).json({ error: 'Bileşen seçimi zorunludur.' });
        return;
      }
      if (!Number.isFinite(listingPriceTry) || listingPriceTry <= 0) {
        res.status(400).json({ error: 'Geçerli bir pozitif TL ilan fiyatı giriniz.' });
        return;
      }
      if (!VALID_PLATFORMS.includes(platform)) {
        res.status(400).json({ error: 'Geçersiz ilan platformu seçildi.' });
        return;
      }
      if (!VALID_CONDITIONS.includes(conditionGrade)) {
        res.status(400).json({ error: 'Geçersiz ürün kondisyonu seçildi.' });
        return;
      }
      if (!listingUrl || !/^https?:\/\//i.test(listingUrl)) {
        res.status(400).json({
          error: 'İlan bağlantısı http:// veya https:// ile başlamalıdır.',
        });
        return;
      }
      if (!req.dbUserId) {
        res.status(401).json({ error: 'Kullanıcı oturumu doğrulanamadı.' });
        return;
      }

      const created = await addUserMarketplaceListing({
        userId: req.dbUserId,
        partId,
        productName: body.productName ? String(body.productName) : undefined,
        brandModel: body.brandModel ? String(body.brandModel) : undefined,
        listingPriceTry,
        platform,
        listingUrl,
        listingDate: listingDate || new Date().toISOString().slice(0, 10),
        conditionGrade,
        isNew,
      });

      const catalog = await getPricingCatalog(req.dbUserId);
      res.status(201).json({ created, catalog });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'İlan kaydı eklenemedi.',
      });
    }
  });

  app.delete('/api/pricing/listings/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUserId) {
        res.status(401).json({ error: 'Kullanıcı oturumu doğrulanamadı.' });
        return;
      }
      const result = await deleteUserMarketplaceListing(
        String(req.params.id ?? ''),
        req.dbUserId
      );
      if (result === 'not_found') {
        res.status(404).json({ error: 'İlan kaydı bulunamadı.' });
        return;
      }
      if (result === 'forbidden') {
        res.status(403).json({ error: 'Yalnızca kendi eklediğiniz ilanları silebilirsiniz.' });
        return;
      }
      const catalog = await getPricingCatalog(req.dbUserId);
      res.json({ removed: true, catalog });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'İlan kaydı silinemedi.',
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
        hmr: !disableHmr,
        watch: disableHmr ? null : {},
        ws: { server: httpServer },
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
  });
}

startServer();
