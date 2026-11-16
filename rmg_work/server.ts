import 'dotenv/config';
import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  addUserMarketplaceListing,
  deleteUserMarketplaceListing,
  getPricingCatalog,
} from './server/pricing/providers.ts';
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
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'rmg-tech-pricing-api' });
  });

  app.get('/api/pricing/catalog', async (_req, res) => {
    try {
      const catalog = await getPricingCatalog();
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

  app.post('/api/pricing/listings', async (req, res) => {
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

      const created = addUserMarketplaceListing({
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

      const catalog = await getPricingCatalog();
      res.status(201).json({ created, catalog });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'İlan kaydı eklenemedi.',
      });
    }
  });

  app.delete('/api/pricing/listings/:id', async (req, res) => {
    const removed = deleteUserMarketplaceListing(req.params.id);
    if (!removed) {
      res.status(404).json({ error: 'İlan kaydı bulunamadı.' });
      return;
    }
    const catalog = await getPricingCatalog();
    res.json({ removed: true, catalog });
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
  });
}

startServer();
